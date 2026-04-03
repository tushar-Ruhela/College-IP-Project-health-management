from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import whisper
import google.generativeai as genai
from gtts import gTTS
import tempfile
import os
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for React

# Configure Gemini
genai.configure(api_key="AIzaSyBU5cZecPtp5oftEoITHIawSEF-OUrSIvc")

print("🔄 Loading Whisper model...")
whisper_model = whisper.load_model("tiny")
print("✅ Whisper model ready!\n")

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "ok", "message": "Translation service is running"})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "whisper_loaded": whisper_model is not None,
        "message": "Simple translation service is running"
    })

@app.route('/translate', methods=['POST'])
def translate():
    try:
        print("\n" + "="*60)
        print("📥 Received translation request")
        
        # Get audio file from request
        if 'audio' not in request.files:
            print("❌ No audio file in request")
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        source_lang = request.form.get('sourceLang', 'hi')
        target_lang = request.form.get('targetLang', 'en')
        
        print(f"🎤 Source Language: {source_lang}")
        print(f"🔊 Target Language: {target_lang}")
        
        # Save uploaded audio to temp file
        temp_input = tempfile.NamedTemporaryFile(suffix='.webm', delete=False)
        audio_file.save(temp_input.name)
        temp_input.close()
        
        print(f"💾 Audio saved: {temp_input.name}")
        
        # Step 1: Transcribe with Whisper
        print(f"🎧 Transcribing...")
        result = whisper_model.transcribe(temp_input.name, language=source_lang, fp16=False)
        original_text = result["text"].strip()
        
        print(f"📝 Transcribed: {original_text}")
        
        if not original_text or len(original_text) < 2:
            os.unlink(temp_input.name)
            print("⚠️ No speech detected")
            return jsonify({"error": "No speech detected"}), 400
        
        # Step 2: Translate with Gemini
        print(f"🔄 Translating to {target_lang}...")
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Language name mapping for better translation
        lang_names = {
            'en': 'English', 'hi': 'Hindi', 'mr': 'Marathi', 'ta': 'Tamil',
            'te': 'Telugu', 'bn': 'Bengali', 'kn': 'Kannada', 'gu': 'Gujarati',
            'or': 'Odia', 'fr': 'French', 'es': 'Spanish'
        }
        
        target_lang_name = lang_names.get(target_lang, target_lang)
        prompt = f"Translate to {target_lang_name}. Only return the translation.\n\n{original_text}"
        response = model.generate_content(prompt)
        translated_text = response.text.strip()
        
        print(f"✅ Translated: {translated_text}")
        
        # Step 3: Generate speech with gTTS
        print("🔊 Generating audio...")
        tts = gTTS(text=translated_text, lang=target_lang, slow=False)
        temp_output = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
        tts.save(temp_output.name)
        
        print(f"💾 Audio generated: {temp_output.name}")
        
        # Cleanup input file
        os.unlink(temp_input.name)
        
        print("✅ Sending translated audio")
        print("="*60 + "\n")
        
        # Return the audio file
        return send_file(
            temp_output.name,
            mimetype='audio/mp3',
            as_attachment=False,
            download_name='translation.mp3'
        )
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 SIMPLE TRANSLATION SERVER STARTING")
    print("="*60)
    print("📍 Server: http://localhost:5000")
    print("📍 Endpoints:")
    print("   GET  /          - Health check")
    print("   GET  /health    - Detailed health check")
    print("   POST /translate - Translate audio")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
