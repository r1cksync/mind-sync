from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
from datetime import datetime, timedelta
import requests
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Hardcode the YouTube client ID and client secret
client_id = "210998062723-dqc8gs7nuj52rlg24c8u9svtki5nd5lh.apps.googleusercontent.com"
client_secret = "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"

# Log the hardcoded values for debugging
logging.debug(f"YOUTUBE_CLIENT_ID: {client_id}")
logging.debug(f"YOUTUBE_CLIENT_SECRET: {client_secret}")

# Verify the hardcoded values
if not client_id or not client_secret:
    logging.error("Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET")

# Mock database (bypassing MongoDB for testing)
mock_db = {}

# Helper Functions
def analyze_sentiment(text):
    """
    Placeholder for sentiment analysis. Returns a sentiment score between 0 and 100.
    """
    return 50  # Example: 0 (negative) to 100 (positive)

def categorize_emotion(sentiment_score):
    """
    Categorize the sentiment score into an emotional category.
    """
    if sentiment_score < 30:
        return 'sad'
    elif sentiment_score < 50:
        return 'calm'
    elif sentiment_score < 70:
        return 'happy'
    else:
        return 'energetic'

def generate_mental_health_report(video_data):
    """
    Generate a mental health report based on the analyzed videos.
    """
    total = len(video_data)
    if total == 0:
        return "No videos analyzed. Please like some videos on YouTube to generate a report."

    sad_count = sum(1 for v in video_data if v['category'] == 'sad')
    happy_count = sum(1 for v in video_data if v['category'] == 'happy')
    energetic_count = sum(1 for v in video_data if v['category'] == 'energetic')
    calm_count = sum(1 for v in video_data if v['category'] == 'calm')

    report = (
        f"Mental Health Report: Analysis of your YouTube Liked Videos over the last 60 days. "
        f"While this is not a professional diagnosis, it can offer valuable insights into your emotional stability and overall mental well-being.\n\n"
        f"**Key Findings**:\n"
        f"- Total videos liked: {total}\n"
        f"- Sad videos: {sad_count} ({sad_count/total*100:.1f}% of total videos)\n"
        f"- Happy videos: {happy_count} ({happy_count/total*100:.1f}% of total videos)\n"
        f"- Energetic videos: {energetic_count} ({energetic_count/total*100:.1f}% of total videos)\n"
        f"- Calm videos: {calm_count} ({calm_count/total*100:.1f}% of total videos)\n\n"
        f"The high number of happy videos ({happy_count/total*100:.1f}%) indicates that you are drawn to content that evokes feelings of joy, excitement, or inspiration. This could be a sign of a resilient and optimistic personality. The number of sad videos ({sad_count/total*100:.1f}%) is also a positive indicator, as it suggests that you are not frequently exposed to content that might be emotionally distressing. However, the absence of calm videos ({calm_count/total*100:.1f}%) might indicate that you are not seeking relaxation or calming content, which could be a concern for mental well-being. A balanced emotional state often involves a mix of positive and calming experiences.\n\n"
        f"**Potential Concerns**:\n"
        f"1. **Overemphasis on happy content**: While it’s great that you are drawn to happy content, an overemphasis on this type of content might indicate that you are avoiding or suppressing negative emotions. This could lead to emotional numbness, making it challenging to address underlying issues.\n"
        f"2. **Lack of calming content**: The absence of calm videos might suggest that you are not prioritizing self-care or relaxation. This could lead to burnout, anxiety, or some mental health concerns.\n\n"
        f"**Suggestions for Improving Mental Well-Being**:\n"
        f"1. **Explore calming content**: Encourage yourself to seek out calming content, such as meditation videos, nature documentaries, or relaxing music. This can help you explore a more diverse emotional content, including educational videos, or even content that might challenge your perspectives.\n"
        f"2. **Engage with a variety of content**: This can help you develop emotional intelligence and better cope with challenging situations.\n"
        f"3. **Practice emotional awareness**: Encourage yourself to reflect on your emotions and acknowledge your feelings, even if they are not always positive.\n\n"
        f"**Conclusion**: This analysis provides a snapshot of your emotional state based on your YouTube liked videos. While there are some potential concerns, the overall picture suggests a predominantly positive emotional state. By being aware of these findings and taking steps to address the potential concerns, you can continue to prioritize your mental well-being and cultivate a more balanced emotional state."
    )
    return report

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify the backend is running.
    """
    return jsonify({"status": "healthy", "message": "Backend is running"}), 200

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "Backend is working!"}), 200

@app.route('/api/save-user', methods=['POST'])
def save_user():
    try:
        logging.debug("Received POST request to /api/save-user")
        data = request.json
        logging.debug(f"Request data: {data}")
        clerk_user_id = data.get('user_id')
        email = data.get('email')
        auth_method = data.get('auth_method')

        if not all([clerk_user_id, email, auth_method]):
            logging.error("Missing required fields in request data")
            return jsonify({"error": "Missing required fields"}), 400

        user_doc = {
            "clerk_user_id": clerk_user_id,
            "email": email,
            "auth_method": auth_method,
            "created_at": request.json.get('created_at') or datetime.utcnow().isoformat()
        }
        
        # Mock database operation
        mock_db[clerk_user_id] = user_doc
        logging.debug(f"User saved to mock DB: {clerk_user_id}")
        return jsonify({"message": "User saved successfully"}), 200
    except Exception as e:
        logging.error(f"Error in /api/save-user: {e}")
        return jsonify({"error": "Failed to save user", "details": str(e)}), 500

@app.route('/api/save-youtube-token', methods=['POST'])
def save_youtube_token():
    try:
        logging.debug("Received POST request to /api/save-youtube-token")
        data = request.json
        logging.debug(f"Request data: {data}")
        user_id = data.get('user_id')
        code = data.get('code')
        redirect_uri = data.get('redirect_uri')

        if not all([user_id, code, redirect_uri]):
            logging.error("Missing required fields in request data")
            return jsonify({"error": "Missing required fields: user_id, code, and redirect_uri are required"}), 400

        # Check if client_id and client_secret are set
        if not client_id or not client_secret:
            logging.error("YouTube client ID or client secret not configured")
            return jsonify({"error": "Server configuration error: Missing YouTube client ID or client secret"}), 500

        # Exchange the code for an access token
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }

        logging.debug(f"Sending token exchange request to Google: {payload}")
        response = requests.post(token_url, data=payload)
        logging.debug(f"Token exchange HTTP status: {response.status_code}")
        logging.debug(f"Token exchange raw response: {response.text}")

        if response.status_code != 200:
            logging.error(f"Failed to exchange code for token: {response.status_code} - {response.text}")
            try:
                error_data = response.json()
                return jsonify({"error": "Failed to exchange code for token", "details": error_data}), 500
            except ValueError:
                return jsonify({"error": "Failed to exchange code for token", "details": response.text}), 500

        # Parse the token response
        try:
            token_data = response.json()
            logging.debug(f"Parsed token data: {token_data}")
        except ValueError as e:
            logging.error(f"Failed to parse token response as JSON: {e}")
            return jsonify({"error": "Failed to parse token response", "details": response.text}), 500

        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')

        if not access_token:
            logging.error("No access token received from Google")
            return jsonify({"error": "Failed to obtain access token from Google", "details": token_data}), 500

        # Mock saving the tokens to the database
        if user_id not in mock_db:
            logging.error("User not found in mock DB")
            return jsonify({"error": "User not found"}), 404

        mock_db[user_id].update({
            "youtube_access_token": access_token,
            "youtube_refresh_token": refresh_token,
            "youtube_connected_at": datetime.utcnow().isoformat()
        })
        logging.debug(f"YouTube token saved to mock DB for user {user_id}")
        return jsonify({"message": "YouTube token saved successfully"}), 200

    except Exception as e:
        logging.error(f"Unexpected error in /api/save-youtube-token: {e}")
        return jsonify({"error": "Unexpected server error", "details": str(e)}), 500

@app.route('/api/get-youtube-token', methods=['POST'])
def get_youtube_token():
    try:
        logging.debug("Received POST request to /api/get-youtube-token")
        data = request.json
        user_id = data.get('user_id')

        if not user_id:
            logging.error("Missing user_id in request data")
            return jsonify({"error": "Missing user_id"}), 400

        user = mock_db.get(user_id)
        if user and user.get('youtube_access_token'):
            return jsonify({
                "access_token": user['youtube_access_token'],
                "refresh_token": user.get('youtube_refresh_token')
            }), 200
        return jsonify({"access_token": None}), 404
    except Exception as e:
        logging.error(f"Error in /api/get-youtube-token: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-youtube', methods=['POST'])
def check_youtube():
    try:
        logging.debug("Received POST request to /api/check-youtube")
        data = request.json
        user_id = data.get('user_id')

        if not user_id:
            logging.error("Missing user_id in request data")
            return jsonify({"error": "Missing user_id"}), 400

        user = mock_db.get(user_id)
        if user and user.get('youtube_access_token'):
            return jsonify({"connected": True}), 200
        return jsonify({"connected": False}), 200
    except Exception as e:
        logging.error(f"Error in /api/check-youtube: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear-youtube-token', methods=['POST'])
def clear_youtube_token():
    try:
        logging.debug("Received POST request to /api/clear-youtube-token")
        data = request.json
        user_id = data.get('user_id')

        if not user_id:
            logging.error("Missing user_id in request data")
            return jsonify({"error": "Missing user_id"}), 400

        if user_id in mock_db:
            user = mock_db[user_id]
            user.pop("youtube_access_token", None)
            user.pop("youtube_refresh_token", None)
            user.pop("youtube_connected_at", None)
            user.pop("youtube_metrics", None)
            user.pop("youtube_report", None)
            user.pop("youtube_report_generated_at", None)
            logging.debug(f"Cleared YouTube token for user {user_id} in mock DB")
            return jsonify({"message": "YouTube token cleared successfully"}), 200
        else:
            logging.debug(f"No YouTube token found for user {user_id}")
            return jsonify({"message": "No token to clear"}), 200
    except Exception as e:
        logging.error(f"Error in /api/clear-youtube-token: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-youtube-report', methods=['POST'])
def save_youtube_report():
    try:
        logging.debug("Received POST request to /api/save-youtube-report")
        data = request.json
        logging.debug(f"Request data: {data}")
        user_id = data.get('user_id')
        metrics = data.get('metrics')
        report = data.get('report')

        if not all([user_id, metrics, report]):
            logging.error("Missing required fields in request data")
            return jsonify({"error": "Missing required fields"}), 400

        if user_id not in mock_db:
            logging.error("User not found in mock DB")
            return jsonify({"error": "User not found"}), 404

        mock_db[user_id].update({
            "youtube_metrics": metrics,
            "youtube_report": report,
            "youtube_report_generated_at": datetime.utcnow().isoformat()
        })
        logging.debug(f"Report saved to mock DB for user {user_id}")
        return jsonify({"message": "Report saved successfully"}), 200
    except Exception as e:
        logging.error(f"Error in /api/save-youtube-report: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-youtube-report', methods=['POST'])
def get_youtube_report():
    try:
        logging.debug("Received POST request to /api/get-youtube-report")
        data = request.json
        user_id = data.get('user_id')

        if not user_id:
            logging.error("Missing user_id in request data")
            return jsonify({"error": "Missing user_id"}), 400

        user = mock_db.get(user_id)
        if user and user.get('youtube_report'):
            return jsonify({
                "metrics": user.get('youtube_metrics'),
                "report": user.get('youtube_report')
            }), 200
        return jsonify({"metrics": None, "report": None}), 404
    except Exception as e:
        logging.error(f"Error in /api/get-youtube-report: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze-youtube', methods=['POST'])
def analyze_youtube():
    try:
        logging.debug("Received POST request to /api/analyze-youtube")
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            logging.error("Missing user_id in request data")
            return jsonify({'error': 'User ID is required'}), 400

        # Fetch user from mock DB
        user = mock_db.get(user_id)
        if not user or 'youtube_access_token' not in user:
            logging.error("YouTube not connected for user")
            return jsonify({'error': 'YouTube not connected'}), 400

        access_token = user['youtube_access_token']
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {'part': 'snippet', 'maxResults': 50, 'myRating': 'like'}

        # Fetch liked videos from YouTube API
        response = requests.get('https://www.googleapis.com/youtube/v3/videos', headers=headers, params=params)
        logging.debug(f"Fetch liked videos HTTP status: {response.status_code}")
        if response.status_code != 200:
            logging.error(f"Failed to fetch liked videos: {response.status_code} - {response.text}")
            return jsonify({'error': 'Failed to fetch liked videos', 'details': response.json()}), 500

        videos = response.json().get('items', [])
        video_data = []
        cutoff_date = datetime.utcnow() - timedelta(days=60)  # Last 60 days

        # Analyze each video
        for video in videos:
            snippet = video.get('snippet', {})
            published_at = snippet.get('publishedAt', '')
            if not published_at:
                continue

            try:
                published_date = datetime.strptime(published_at, '%Y-%m-%dT%H:%M:%SZ')
            except ValueError:
                logging.warning(f"Invalid publishedAt format for video: {published_at}")
                continue

            if published_date < cutoff_date:
                continue

            title = snippet.get('title', '')
            description = snippet.get('description', '')
            video_id = video.get('id', '')

            # Fetch comments
            try:
                comments_response = requests.get(
                    'https://www.googleapis.com/youtube/v3/commentThreads',
                    headers=headers,
                    params={'part': 'snippet', 'videoId': video_id, 'maxResults': 20}
                )
                if comments_response.status_code != 200:
                    logging.warning(f"Failed to fetch comments for video {video_id}: {comments_response.status_code}")
                    comment_texts = []
                else:
                    comments = comments_response.json().get('items', [])
                    comment_texts = [comment['snippet']['topLevelComment']['snippet']['textDisplay'] for comment in comments]
            except Exception as e:
                logging.warning(f"Error fetching comments for video {video_id}: {e}")
                comment_texts = []

            # Perform sentiment analysis
            text_to_analyze = f"{title} {description} {' '.join(comment_texts)}"
            sentiment_score = analyze_sentiment(text_to_analyze)
            category = categorize_emotion(sentiment_score)

            video_data.append({
                'title': title,
                'description': description,
                'sentimentScore': sentiment_score,
                'category': category,
                'publishedAt': published_at
            })

        # Calculate category counts
        sad_count = sum(1 for v in video_data if v['category'] == 'sad')
        happy_count = sum(1 for v in video_data if v['category'] == 'happy')
        energetic_count = sum(1 for v in video_data if v['category'] == 'energetic')
        calm_count = sum(1 for v in video_data if v['category'] == 'calm')

        # Calculate total videos and average sentiment score
        total_videos = len(video_data)
        average_sentiment_score = sum(v['sentimentScore'] for v in video_data) / total_videos if total_videos > 0 else 0

        # Calculate sentiment over time (daily averages)
        sentiment_over_time = {}
        for video in video_data:
            published_date = datetime.strptime(video['publishedAt'], '%Y-%m-%dT%H:%M:%SZ')
            date_key = published_date.strftime('%Y-%m-%d')
            if date_key not in sentiment_over_time:
                sentiment_over_time[date_key] = {'total_score': 0, 'count': 0}
            sentiment_over_time[date_key]['total_score'] += video['sentimentScore']
            sentiment_over_time[date_key]['count'] += 1

        sentiment_over_time_list = [
            {'date': date, 'score': data['total_score'] / data['count']}
            for date, data in sorted(sentiment_over_time.items())
        ]

        # Generate mental health report
        report = generate_mental_health_report(video_data)

        # Prepare metrics
        metrics = {
            'sadCount': sad_count,
            'happyCount': happy_count,
            'energeticCount': energetic_count,
            'calmCount': calm_count,
            'videos': video_data,
            'totalVideos': total_videos,
            'averageSentimentScore': average_sentiment_score,
            'sentimentOverTime': sentiment_over_time_list
        }

        # Save the report and metrics to mock DB
        mock_db[user_id].update({
            "youtube_metrics": metrics,
            "youtube_report": report,
            "youtube_report_generated_at": datetime.utcnow().isoformat()
        })
        logging.debug(f"Report saved to mock DB for user {user_id}")
        return jsonify({'report': report, 'metrics': metrics}), 200
    except Exception as e:
        logging.error(f"Error in /api/analyze-youtube: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)