import os
import ssl
import time
import uuid
import warnings
import threading
from io import BytesIO
import numpy as np
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import whisper
import google.generativeai as genai
from gtts import gTTS
import pygame
import sounddevice as sd
import base64
import json

# Suppress warnings
warnings.filterwarnings('ignore')
ssl._create_default_https_context = ssl._create_unverified_context

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'translation-service-secret-key'
CORS(app, origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Configure APIs
genai.configure(api_key="AIzaSyBU5cZecPtp5oftEoITHIawSEF-OUrSIvc")

# Initialize pygame for audio playback
pygame.mixer.init()

# Language mapping
LANG_MAP = {
    "en": ("en", "en", "English"),
    "hi": ("hi", "hi", "Hindi"),
    "kn": ("kn", "kn", "Kannada"),
    "ta": ("ta", "ta", "Tamil"),
    "te": ("te", "te", "Telugu"),
    "bn": ("bn", "bn", "Bengali"),
    "mr": ("mr", "mr", "Marathi"),
    "gu": ("gu", "gu", "Gujarati"),
    "or": ("or", "or", "Odia"),
    "fr": ("fr", "fr", "French"),
    "es": ("es", "es", "Spanish")
}

class TranslationService:
    def __init__(self):
        self.whisper_model = None
        self.active_rooms = {}
        self.load_whisper_model()
    
    def load_whisper_model(self):
        """Load Whisper model with retry logic"""
        for attempt in range(3):
            try:
                print(f"⏳ Loading Whisper model... (Attempt {attempt + 1}/3)")
                self.whisper_model = whisper.load_model("base", download_root="./whisper_models")
                print("✅ Whisper model loaded successfully!")
                return
            except Exception as e:
                print(f"❌ Attempt {attempt + 1} failed: {e}")
                if attempt < 2:
                    time.sleep(3)
        
        # Fallback to tiny model
        try:
            print("🔄 Trying smaller 'tiny' model...")
            self.whisper_model = whisper.load_model("tiny", download_root="./whisper_models")
            print("✅ Tiny Whisper model loaded!")
        except Exception as e:
            print(f"❌ Failed to load any model: {e}")
    
    def translate_text(self, text, target_language):
        """Translate text using Gemini 2.0 Flash"""
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            lang_name = LANG_MAP.get(target_language, (None, None, target_language))[2]
            prompt = f"Translate to {lang_name}. Only return the translation, no explanations.\n\nText: {text}"
            response = model.generate_content(prompt)
            translation = response.text.strip()
            return translation
        except Exception as e:
            print(f"❌ Translation error: {e}")
            return text
    
    def transcribe_audio(self, audio_data, source_language):
        """Transcribe audio using Whisper"""
        try:
            if self.whisper_model is None:
                return ""
            
            # Convert audio data to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.float32)
            
            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                audio_array,
                language=source_language,
                fp16=False
            )
            
            return result["text"].strip()
        except Exception as e:
            print(f"❌ Transcription error: {e}")
            return ""
    
    def generate_speech(self, text, language):
        """Generate speech using gTTS and return audio data"""
        try:
            # Use unique filename to avoid conflicts
            audio_file = f"temp_audio_{uuid.uuid4().hex[:8]}.mp3"
            
            # Generate speech
            tts = gTTS(text=text, lang=language, slow=False)
            tts.save(audio_file)
            
            # Read audio file as binary data
            with open(audio_file, 'rb') as f:
                audio_data = f.read()
            
            # Cleanup
            try:
                os.remove(audio_file)
            except:
                pass
            
            return audio_data
        except Exception as e:
            print(f"❌ Speech generation error: {e}")
            return None

# Initialize translation service
translation_service = TranslationService()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'whisper_loaded': translation_service.whisper_model is not None,
        'active_rooms': len(translation_service.active_rooms)
    })

@socketio.on('connect')
def handle_connect():
    print(f"🔌 Translation client connected: {request.sid}")
    emit('connected', {'status': 'Translation service ready'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"❌ Translation client disconnected: {request.sid}")
    # Clean up any room associations
    for room_id in list(translation_service.active_rooms.keys()):
        if request.sid in translation_service.active_rooms[room_id]:
            translation_service.active_rooms[room_id].remove(request.sid)
            if not translation_service.active_rooms[room_id]:
                del translation_service.active_rooms[room_id]

@socketio.on('join_translation_room')
def handle_join_room(data):
    room_id = data.get('roomId')
    user_language = data.get('userLanguage', 'en')
    target_language = data.get('targetLanguage', 'hi')
    
    join_room(room_id)
    
    if room_id not in translation_service.active_rooms:
        translation_service.active_rooms[room_id] = []
    
    translation_service.active_rooms[room_id].append({
        'sid': request.sid,
        'userLanguage': user_language,
        'targetLanguage': target_language
    })
    
    print(f"📥 User {request.sid} joined translation room {room_id}")
    emit('joined_translation_room', {'roomId': room_id, 'status': 'success'})

@socketio.on('leave_translation_room')
def handle_leave_room(data):
    room_id = data.get('roomId')
    leave_room(room_id)
    
    if room_id in translation_service.active_rooms:
        translation_service.active_rooms[room_id] = [
            user for user in translation_service.active_rooms[room_id] 
            if user['sid'] != request.sid
        ]
        if not translation_service.active_rooms[room_id]:
            del translation_service.active_rooms[room_id]
    
    print(f"📤 User {request.sid} left translation room {room_id}")

@socketio.on('audio_for_translation')
def handle_audio_translation(data):
    try:
        room_id = data.get('roomId')
        audio_base64 = data.get('audioData')
        source_language = data.get('sourceLanguage', 'en')
        target_language = data.get('targetLanguage', 'hi')
        sender_id = data.get('senderId', request.sid)
        
        if not audio_base64:
            return
        
        # Decode base64 audio data
        audio_data = base64.b64decode(audio_base64)
        
        # Transcribe audio
        transcribed_text = translation_service.transcribe_audio(audio_data, source_language)
        
        if not transcribed_text or len(transcribed_text.strip()) < 3:
            return
        
        print(f"🎤 Transcribed ({source_language}): {transcribed_text}")
        
        # Translate text
        translated_text = translation_service.translate_text(transcribed_text, target_language)
        print(f"🔄 Translated ({target_language}): {translated_text}")
        
        # Generate speech for translation
        speech_data = translation_service.generate_speech(translated_text, target_language)
        
        if speech_data:
            # Convert to base64 for transmission
            speech_base64 = base64.b64encode(speech_data).decode('utf-8')
            
            # Send translation to room (excluding sender)
            emit('translation_result', {
                'originalText': transcribed_text,
                'translatedText': translated_text,
                'audioData': speech_base64,
                'sourceLanguage': source_language,
                'targetLanguage': target_language,
                'senderId': sender_id
            }, room=room_id, include_self=False)
            
            print(f"✅ Translation sent to room {room_id}")
    
    except Exception as e:
        print(f"❌ Audio translation error: {e}")
        emit('translation_error', {'error': str(e)})

if __name__ == '__main__':
    print("🚀 Starting Translation Service...")
    print("📡 WebSocket server will be available at http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
