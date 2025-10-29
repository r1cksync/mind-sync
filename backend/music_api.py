from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os
from pydub import AudioSegment
import ffmpeg
import requests
import time

app = FastAPI()

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with ["http://localhost:3000"] for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the Music Download and Emotion Analysis API!"}

class SongRequest(BaseModel):
    song_name: str

def download_music_as_m4a(song_name):
    download_dir = os.path.join(os.getcwd(), "downloads")
    os.makedirs(download_dir, exist_ok=True)  # Ensure downloads directory exists
    search_query = f"ytsearch1:{song_name}"
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': os.path.join(download_dir, '%(title)s.%(ext)s'),  # Specify full path
        'noplaylist': True,
        'quiet': True,
        'postprocessors': [],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(search_query, download=True)
        filename = f"{info.get('title', 'Unknown Title')}.m4a"
        full_path = os.path.join(download_dir, filename)
        print(f"Downloaded to: {full_path}")
        if os.path.exists(full_path):
            print(f"File exists at: {full_path}")
        else:
            print(f"File not found at: {full_path}")
        return full_path

def convert_m4a_to_mp3(m4a_file):
    mp3_file = m4a_file.replace('.m4a', '.mp3')
    try:
        if not os.path.exists(m4a_file):
            raise FileNotFoundError(f"M4A file not found: {m4a_file}")
        print(f"Converting {m4a_file} to {mp3_file}")
        audio = AudioSegment.from_file(m4a_file, format="m4a")
        audio.export(mp3_file, format="mp3", parameters=["-vn"])
        print(f"Converted to: {mp3_file}")
        if os.path.exists(mp3_file):
            os.remove(m4a_file)  # Clean up M4A file
            return mp3_file
        else:
            raise FileNotFoundError(f"MP3 file not created: {mp3_file}")
    except Exception as e:
        print(f"Conversion error: {e}")
        raise

def analyze_emotion_with_music2emo(mp3_file):
    url = "https://huggingface.co/spaces/amaai-lab/music2emo/predict"
    try:
        if not os.path.exists(mp3_file):
            raise FileNotFoundError(f"MP3 file not found: {mp3_file}")
        with open(mp3_file, "rb") as file:
            files = {"file": (mp3_file, file, "audio/mp3")}
            response = requests.post(url, files=files, timeout=30)
            response.raise_for_status()
            result = response.json()
            print(f"music2emo response: {result}")
            return result.get("emotion", "Unknown")
    except requests.exceptions.RequestException as e:
        print(f"music2emo API error: {e}")
        raise
    finally:
        if os.path.exists(mp3_file):
            os.remove(mp3_file)  # Clean up MP3 file

@app.post("/download_and_analyze")
def download_and_analyze(request: SongRequest):
    try:
        # Download as M4A
        m4a_file = download_music_as_m4a(request.song_name)
        time.sleep(1)  # Add a small delay to ensure file is written
        if not os.path.exists(m4a_file):
            raise FileNotFoundError(f"Downloaded M4A file not found: {m4a_file}")

        # Convert to MP3
        mp3_file = convert_m4a_to_mp3(m4a_file)

        # Analyze with music2emo
        emotion = analyze_emotion_with_music2emo(mp3_file)
        return {"message": "✅ Downloaded and analyzed", "file": mp3_file, "emotion": emotion}
    except Exception as e:
        return {"message": "❌ Error", "error": str(e)}, 500