import spotipy
from spotipy.oauth2 import SpotifyOAuth
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Spotify credentials (hardcoded for testing)
CLIENT_ID = "abe04c5b43a446e1a1f632a849b9e44b"
CLIENT_SECRET = "ce07334dfb0a42078af907d9529f6ff3"
REDIRECT_URI = "http://localhost:3000/api/spotify-callback"  # Must match your Spotify app settings
SCOPE = "user-read-recently-played user-top-read"

# Initialize Spotify OAuth
sp_oauth = SpotifyOAuth(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    redirect_uri=REDIRECT_URI,
    scope=SCOPE,
    cache_path=".spotifycache"  # Stores tokens in a file
)

# Function to get or refresh token
def get_spotify_client():
    token_info = sp_oauth.get_cached_token()
    if not token_info:
        auth_url = sp_oauth.get_authorize_url()
        print(f"Please visit this URL to authorize the app: {auth_url}")
        response = input("Enter the URL you were redirected to: ")
        code = sp_oauth.parse_response_code(response)
        token_info = sp_oauth.get_access_token(code)
    elif sp_oauth.is_token_expired(token_info):
        print("Token expired, refreshing...")
        token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
    return spotipy.Spotify(auth=token_info['access_token']), token_info

# Test fetching top track
def fetch_top_track(sp):
    try:
        top_tracks = sp.current_user_top_tracks(limit=1, time_range='medium_term')
        if not top_tracks['items']:
            print("No top tracks found.")
            return None
        track = top_tracks['items'][0]
        print(f"Top Track: {track['name']} by {', '.join(artist['name'] for artist in track['artists'])}")
        return track
    except spotipy.exceptions.SpotifyException as e:
        print(f"Spotify API error: {e.http_status} - {e.msg}")
        return None

# Main test
if __name__ == "__main__":
    # Step 1: Get initial token and fetch top track
    sp, token_info = get_spotify_client()
    fetch_top_track(sp)

    # Step 2: Simulate token expiration by waiting (access tokens expire after 3600 seconds)
    print("\nWaiting 10 seconds to simulate token usage (not enough to expire, but we'll force refresh for demo)...")
    time.sleep(10)

    # Step 3: Force refresh token and fetch top track again
    print("\nForcing token refresh...")
    token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
    sp = spotipy.Spotify(auth=token_info['access_token'])
    fetch_top_track(sp)