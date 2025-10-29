from flask import Flask, request, jsonify, redirect
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import joblib
import os
import requests
from dotenv import load_dotenv
from flask_cors import CORS

# Load environment variables
load_dotenv()

# Initialize Flask app with CORS
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "http://localhost:3000"},
    r"/top-tracks": {"origins": "http://localhost:3000"},
    r"/analyze-emotion": {"origins": "http://localhost:3000"},
    r"/top-track": {"origins": "http://localhost:3000"}
}, support_credentials=True)

# Spotify OAuth setup
scope = "user-read-recently-played user-top-read"
sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
    scope=scope
)

# Load the pre-trained model
model_path = os.path.join(os.path.dirname(__file__), 'optimized_xgb_model.pkl')
try:
    model = joblib.load(model_path)
except Exception as e:
    print(f"Error loading model from {model_path}: {e}")
    raise
emotion_labels = {0: 'Sad', 1: 'Neutral', 2: 'Happy'}

# OpenRouter API setup
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def get_llm_feedback(prompt):
    if not OPENROUTER_API_KEY:
        print("Error: OPENROUTER_API_KEY not set")
        return "Error: OpenRouter API key not configured"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "meta-llama/llama-3.1-8b-instruct",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 150,
        "temperature": 0.7,
    }

    try:
        response = requests.post(OPENROUTER_API_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        feedback = response.json()["choices"][0]["message"]["content"].strip()
        print(f"OpenRouter response: {feedback}")
        return feedback
    except requests.exceptions.RequestException as e:
        print(f"OpenRouter API error: {e}")
        return f"Error: Failed to get feedback from OpenRouter - {str(e)}"

@app.route('/login')
def login():
    auth_url = sp_oauth.get_authorize_url(show_dialog=True)
    print(f"Redirecting to Spotify auth URL: {auth_url}")
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    if not code:
        return jsonify({'error': 'No authorization code'}), 400

    try:
        token_info = sp_oauth.get_access_token(code, check_cache=False)
        access_token = token_info if isinstance(token_info, str) else token_info['access_token']
        print(f"Successfully obtained access token: {access_token[:10]}... with full token info: {token_info}")
        print(f"Authorized scopes: {token_info.get('scope', 'No scopes') if isinstance(token_info, dict) else 'No scopes'}")
        return jsonify({'access_token': access_token})
    except Exception as e:
        print(f"Error getting access token: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/top-tracks', methods=['GET'])
def get_top_tracks():
    access_token = request.args.get('access_token')
    if not access_token:
        return jsonify({'error': 'No access token provided'}), 401

    try:
        sp = spotipy.Spotify(auth=access_token)
        user = sp.current_user()
        print(f"Token validated for user: {user.get('display_name', 'Unknown')}")
        results = sp.current_user_top_tracks(limit=10, time_range='medium_term')
        tracks = [
            {
                'name': item['name'],
                'artists': ', '.join(artist['name'] for artist in item['artists']),
                'id': item['id']
            }
            for item in results['items']
        ]
        print(f"Retrieved {len(tracks)} top tracks: {[t['name'] for t in tracks]}")

        track_names = [track['name'] for track in tracks]
        prompt = (
            "Analyze the following list of song titles to infer key insights about the user's mental health. "
            "Provide a concise, point-by-point report (bullet points) focusing on potential mental health indicators such as mood, stress, or emotional patterns. "
            "Do not adopt a humanized tone; present the analysis as objective observations based on the song titles. "
            "Here are the song titles:\n"
            f"{', '.join(track_names)}\n\n"
            "Report format:\n"
            "- Insight 1: [Observation based on song titles]\n"
            "- Insight 2: [Observation based on song titles]\n"
            "- Insight 3: [Observation based on song titles]\n"
        )
        llm_feedback = get_llm_feedback(prompt)

        return jsonify({"tracks": tracks, "llm_feedback": llm_feedback})
    except spotipy.exceptions.SpotifyException as e:
        print(f"Spotify API error in top-tracks: {e.http_status} - {e.code} - {e.msg}")
        return jsonify({'error': f'Spotify API error: {e.msg}'}), e.http_status
    except Exception as e:
        print(f"Unexpected error in top-tracks: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/top-track', methods=['GET'])
def get_top_track():
    access_token = request.args.get('access_token')
    if not access_token:
        return jsonify({'error': 'No access token provided'}), 401

    try:
        sp = spotipy.Spotify(auth=access_token)
        user = sp.current_user()
        print(f"Token validated for user: {user.get('display_name', 'Unknown')}")
        top_tracks = sp.current_user_top_tracks(limit=1, time_range='medium_term')
        if not top_tracks['items']:
            return jsonify({'error': 'No top tracks found'}), 404
        top_track = top_tracks['items'][0]
        top_track_data = {
            'name': top_track['name'],
            'artists': ', '.join(artist['name'] for artist in top_track['artists']),
            'id': top_track['id']
        }
        print(f"Retrieved top track: {top_track_data['name']}")

        prompt = (
            "Analyze the following song title to infer its likely emotional tone. "
            "Provide a single emotion label (e.g., Sad, Happy, Angry, Neutral) based on the title. "
            "Do not adopt a humanized tone; present the analysis as an objective observation. "
            f"Song title: {top_track_data['name']}\n"
        )
        emotion = get_llm_feedback(prompt)
        return jsonify({"top_track": top_track_data, "emotion": emotion})
    except spotipy.exceptions.SpotifyException as e:
        print(f"Spotify API error in top-track: {e.http_status} - {e.code} - {e.msg}")
        return jsonify({'error': f'Spotify API error: {e.msg}'}), e.http_status
    except Exception as e:
        print(f"Unexpected error in top-track: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-emotion', methods=['POST'])
def analyze_emotion():
    data = request.get_json()
    access_token = data.get('access_token')
    tracks = data.get('tracks', [])

    if not access_token or not tracks:
        return jsonify({'error': 'Access token or tracks missing'}), 400

    try:
        sp = spotipy.Spotify(auth=access_token)
        track_ids = [track['id'] for track in tracks]
        print(f"Requesting audio features for track IDs: {track_ids}")
        audio_features = sp.audio_features(track_ids)
        if audio_features is None:
            raise spotipy.exceptions.SpotifyException(403, -1, "No audio features returned")

        if not audio_features or all(f is None for f in audio_features):
            return jsonify({'error': 'No audio features retrieved from Spotify'}), 400

        features_data = [
            {
                'danceability': f.get('danceability', 0),
                'energy': f.get('energy', 0),
                'loudness': f.get('loudness', 0),
                'speechiness': f.get('speechiness', 0),
                'acousticness': f.get('acousticness', 0),
                'instrumentalness': f.get('instrumentalness', 0),
                'liveness': f.get('liveness', 0),
                'valence': f.get('valence', 0),
                'tempo': f.get('tempo', 0),
                'spec_rate': f.get('spectral_rolloff', 0) / 1e7 if f.get('spectral_rolloff') else 0
            }
            for f in audio_features if f
        ]

        if not features_data:
            return jsonify({'error': 'No valid audio features processed'}), 400

        X = [[d[f] for f in ['danceability', 'energy', 'loudness', 'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'spec_rate']] for d in features_data]
        prediction = model.predict(X)
        if len(prediction) == 0:
            return jsonify({'error': 'No prediction generated by model'}), 400
        predicted_emotion = emotion_labels[prediction[0]]
        print(f"Predicted emotion for tracks: {predicted_emotion}")
        return jsonify({'emotion': predicted_emotion})
    except spotipy.exceptions.SpotifyException as e:
        print(f"Spotify API error in analyze-emotion: {e.http_status} - {e.code} - {e.msg}")
        return jsonify({'error': f'Spotify API error: {e.msg}'}), e.http_status
    except ValueError as e:
        print(f"Value error in analyze-emotion: {e}")
        return jsonify({'error': f'Invalid data for model: {str(e)}'}), 400
    except Exception as e:
        print(f"Unexpected error in analyze-emotion: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/save-user', methods=['POST'])
def save_user():
    data = request.get_json()
    print(f"Received user data: {data}")
    return jsonify({'status': 'success', 'message': 'User data saved'}), 200

if __name__ == '__main__':
    app.run(port=5007, debug=True)