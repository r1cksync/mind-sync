import spotipy
from spotipy.oauth2 import SpotifyOAuth
import requests
import webbrowser
import time

# Hardcoded environment variables from .env
SPOTIFY_CLIENT_ID = "abe04c5b43a446e1a1f632a849b9e44b"
SPOTIFY_CLIENT_SECRET = "ce07334dfb0a42078af907d9529f6ff3"
SPOTIFY_REDIRECT_URI = "http://localhost:3000/api/spotify-callback"
# Minimal scope to test
SCOPE = "user-read-audio-features"

# Initialize Spotify OAuth
sp_oauth = SpotifyOAuth(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
    redirect_uri=SPOTIFY_REDIRECT_URI,
    scope=SCOPE,
    show_dialog=True
)

# Function to get access token with automated browser opening
def get_access_token():
    auth_url = sp_oauth.get_authorize_url()
    print(f"Opening authorization URL in browser: {auth_url}")
    webbrowser.open(auth_url)
    
    # Wait for user to authorize and get the code
    code = None
    for _ in range(60):  # Wait up to 60 seconds
        try:
            code = input("Enter the authorization code from the redirect URL (or press Enter to skip): ").strip()
            if code:
                break
        except Exception as e:
            print(f"Error waiting for code: {e}")
        time.sleep(1)
    
    if not code:
        print("No code received. Authorization failed or timed out.")
        return None
    
    try:
        token_info = sp_oauth.get_access_token(code, as_dict=True)
        access_token = token_info['access_token']
        print(f"Successfully obtained access token: {access_token[:10]}... with full token info: {token_info}")
        return access_token
    except Exception as e:
        print(f"Error getting access token: {e}")
        return None

# Function to test audio features endpoint
def test_audio_features(access_token, track_ids):
    if not access_token:
        print("No access token available.")
        return
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://api.spotify.com/v1/audio-features/?ids={','.join(track_ids)}"
    print(f"Testing URL: {url}")
    
    response = requests.get(url, headers=headers)
    print(f"Response Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Audio Features Data: {data}")
    else:
        print(f"Error Details: {response.json() if response.text else 'No additional details'}")

# Function to check valid scopes (optional diagnostic)
def check_valid_scopes(access_token):
    if not access_token:
        print("No access token to check scopes.")
        return
    sp = spotipy.Spotify(auth=access_token)
    try:
        user = sp.current_user()
        print(f"User validated: {user.get('display_name', 'Unknown')}")
        # This is a basic check; Spotify doesn't provide a direct scope validation API
        print("Scope validation not directly supported by API. Check dashboard configuration.")
    except Exception as e:
        print(f"Scope check failed: {e}")

if __name__ == "__main__":
    # Get access token
    access_token = get_access_token()
    
    if access_token:
        # Track IDs from your logs
        track_ids = [
            "1esUHh1CO18DH1gZlrr4BO", "1OKvqRUG3QbaqLWGn7bhzF", "6HoormOziAMkV1xVgqTciy",
            "6zFmX7Ekq0Jr85vM4BBCWT", "5v7oj9PosKdE39x9uwDs6C", "1kADZJDyRUbmlLxYiqi077",
            "3zyO9hjOE3yjb3FuLCr8vG", "2qqc9tXKiSBrYDviqD18V9", "6ZRArdDgvA42pif7GvY2BA",
            "4ZKm0biqFBtnpsMKKWAGYd"
        ]
        
        # Test the audio features endpoint
        test_audio_features(access_token, track_ids)
        
        # Optional: Check if the token works with basic API calls
        check_valid_scopes(access_token)
    else:
        print("Test aborted due to authentication failure.")