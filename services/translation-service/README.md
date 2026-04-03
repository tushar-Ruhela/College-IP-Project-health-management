# Real-time Translation Service for Nirogya

This service provides real-time speech translation for video calls using OpenAI Whisper for speech recognition, Google Gemini for translation, and gTTS for speech synthesis.

## Features

- **Real-time Speech Recognition**: Uses OpenAI Whisper for accurate speech-to-text conversion
- **Multi-language Translation**: Powered by Google Gemini 2.0 Flash for high-quality translations
- **Text-to-Speech**: Converts translated text back to speech using Google Text-to-Speech
- **WebSocket Communication**: Real-time audio streaming and translation results
- **Multiple Language Support**: English, Hindi, Marathi, Tamil, Telugu, Bengali, Kannada, Gujarati, Odia, French, Spanish

## Prerequisites

- Python 3.8 or higher
- Windows 10/11 (tested)
- Microphone access
- Internet connection for translation services

## Installation

### 1. Install Python Dependencies

```bash
cd translation-service
pip install -r requirements.txt
```

### 2. Install System Dependencies

**For Windows:**
- Install Microsoft Visual C++ Redistributable
- Install Windows Media Feature Pack (if not already installed)

**Additional Notes:**
- The first run will download the Whisper model (~150MB for base model)
- Models are cached locally for faster subsequent runs

## Configuration

### API Keys

The service uses Google Gemini API for translation. The API key is currently hardcoded in the service for demo purposes:

```python
genai.configure(api_key="AIzaSyBU5cZecPtp5oftEoITHIawSEF-OUrSIvc")
```

**For production use, please:**
1. Get your own Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Replace the API key in `translation_server.py`
3. Consider using environment variables for security

### Language Configuration

Supported languages are defined in the `LANG_MAP` dictionary:

```python
LANG_MAP = {
    "en": ("en", "en", "English"),
    "hi": ("hi", "hi", "Hindi"),
    "mr": ("mr", "mr", "Marathi"),
    # ... more languages
}
```

## Usage

### 1. Start the Translation Service

**Option A: Using Python directly**
```bash
cd translation-service
python translation_server.py
```

**Option B: Using the batch file (Windows)**
```bash
cd translation-service
start_service.bat
```

The service will start on `http://localhost:5000`

### 2. Enable Translation in the Web App

1. Open the Nirogya web application
2. On the landing page, toggle "Real-time Translation" 
3. Select your language and the other person's language
4. Create or join a room
5. The translation tab will appear in the video call interface

### 3. Using Translation During Calls

1. Click on the "🌍 Translation" tab in the video call
2. Click "Start Recording" to begin capturing audio
3. Speak clearly - your speech will be:
   - Transcribed to text
   - Translated to the target language  
   - Converted to speech and played to the other participant
4. Click "Stop Recording" when done speaking

## How It Works

### Architecture

```
[User Speech] → [Whisper STT] → [Gemini Translation] → [gTTS] → [Other User]
```

### Process Flow

1. **Audio Capture**: WebRTC captures audio from user's microphone
2. **Audio Streaming**: Audio is sent via WebSocket to translation service
3. **Speech Recognition**: Whisper converts speech to text in source language
4. **Translation**: Gemini translates text to target language
5. **Speech Synthesis**: gTTS converts translated text to speech
6. **Audio Delivery**: Translated audio is sent back and played to other participant

### WebSocket Events

- `join_translation_room`: Join a translation room
- `audio_for_translation`: Send audio data for processing
- `translation_result`: Receive translation results
- `translation_error`: Handle translation errors

## Troubleshooting

### Common Issues

**Service won't start:**
- Check if port 5000 is available
- Ensure all dependencies are installed
- Check Python version (3.8+ required)

**Audio not working:**
- Check microphone permissions in browser
- Ensure audio input device is working
- Try refreshing the browser page

**Translation not working:**
- Check internet connection
- Verify API key is valid
- Check browser console for errors

**Poor translation quality:**
- Speak clearly and slowly
- Avoid background noise
- Ensure good microphone quality
- Try shorter sentences

### Performance Optimization

**For better performance:**
- Use a dedicated GPU if available (for Whisper)
- Ensure stable internet connection
- Close unnecessary applications
- Use wired internet connection if possible

**Model Selection:**
- `tiny`: Fastest, least accurate (~39 MB)
- `base`: Good balance (~74 MB) - **Default**
- `small`: Better accuracy (~244 MB)
- `medium`: High accuracy (~769 MB)
- `large`: Best accuracy (~1550 MB)

Change model in `translation_server.py`:
```python
self.whisper_model = whisper.load_model("small")  # Change "base" to desired model
```

## Security Notes

- Translation service runs locally for privacy
- Audio data is processed in real-time and not stored
- API calls to Google Gemini are made over HTTPS
- Consider using your own API keys for production

## Limitations

- Requires internet connection for translation
- Translation quality depends on speech clarity
- Some delay inherent in the translation process
- Limited to supported languages

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Check browser console for error messages
4. Ensure translation service is running and accessible

## License

This service is part of the Nirogya telemedicine platform.
