import { useState, useRef, useCallback } from 'react';

const TRANSLATION_SERVER_URL = 'http://localhost:5000';

export const useSimpleTranslation = (myLanguage, targetLanguage, enabled = false) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationHistory, setTranslationHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Check if translation service is available
  const checkServiceHealth = useCallback(async () => {
    try {
      const response = await fetch(`${TRANSLATION_SERVER_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setIsServiceAvailable(data.whisper_loaded);
        setError(null);
        return true;
      }
    } catch (error) {
      setIsServiceAvailable(false);
      setError('Translation service not available. Please start the service.');
      return false;
    }
    return false;
  }, []);

  // Start recording audio
  const startRecording = useCallback(async () => {
    if (!enabled || isRecording) return;

    // Check service availability first
    const serviceOk = await checkServiceHealth();
    if (!serviceOk) return;

    try {
      console.log('🎤 Starting audio recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudioForTranslation(audioBlob);
        }
        audioChunksRef.current = [];
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
      
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Failed to start recording: ' + error.message);
    }
  }, [enabled, myLanguage, targetLanguage]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    console.log('⏹️ Stopping audio recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    console.log('✅ Recording stopped');
  }, []);

  // Send audio for translation
  const sendAudioForTranslation = useCallback(async (audioBlob) => {
    setIsTranslating(true);
    
    try {
      console.log('📤 Sending audio for translation...');
      
      // Create FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('sourceLang', myLanguage);
      formData.append('targetLang', targetLanguage);
      
      // Send to translation service
      const response = await fetch(`${TRANSLATION_SERVER_URL}/translate`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }
      
      // Get the translated audio
      const audioArrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mp3' });
      
      // Play the translated audio
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      
      // Add to history (we'll need to extract text from headers or modify server)
      const timestamp = new Date();
      setTranslationHistory(prev => [...prev, {
        id: timestamp.getTime(),
        originalText: "Audio transcribed", // Server could return this in headers
        translatedText: "Audio translated", // Server could return this in headers
        sourceLanguage: myLanguage,
        targetLanguage: targetLanguage,
        timestamp: timestamp,
        audioBlob: audioBlob
      }]);
      
      // Play audio
      await audio.play();
      
      // Clean up URL after playing
      audio.onended = () => URL.revokeObjectURL(audio.src);
      
      console.log('✅ Translation completed and played');
      setError(null);
      
    } catch (error) {
      console.error('❌ Translation error:', error);
      setError('Translation failed: ' + error.message);
    } finally {
      setIsTranslating(false);
    }
  }, [myLanguage, targetLanguage]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Clear translation history
  const clearHistory = useCallback(() => {
    setTranslationHistory([]);
  }, []);

  // Replay audio from history
  const replayAudio = useCallback((historyItem) => {
    if (historyItem.audioBlob) {
      const audio = new Audio();
      audio.src = URL.createObjectURL(historyItem.audioBlob);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(audio.src);
    }
  }, []);

  return {
    isRecording,
    isTranslating,
    translationHistory,
    error,
    isServiceAvailable,
    startRecording,
    stopRecording,
    toggleRecording,
    clearHistory,
    replayAudio,
    checkServiceHealth
  };
};
