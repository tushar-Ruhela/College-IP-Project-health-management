import { useState, useRef, useCallback } from 'react';

export const useSimpleTranslationFallback = (preferredLanguage = 'off') => {
  const [isListening, setIsListening] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [translationHistory, setTranslationHistory] = useState([]);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);

  // Google Translate API function
  const translateText = async (text, targetLang) => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translatedText = data[0][0][0];
        const detectedLang = data[2] || 'unknown';
        
        return {
          translatedText,
          detectedLanguage: detectedLang
        };
      }
      
      throw new Error('Translation failed');
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  // Text-to-speech function
  const speakText = (text, language) => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLanguage(language);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      window.speechSynthesis.speak(utterance);
    });
  };

  // Get voice language code
  const getVoiceLanguage = (langCode) => {
    const voiceMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'or': 'or-IN',
      'kn': 'kn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'fr': 'fr-FR',
      'es': 'es-ES'
    };
    return voiceMap[langCode] || langCode;
  };

  // Manual start listening
  const startListening = useCallback(async () => {
    if (preferredLanguage === 'off') return;

    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false; // Single recognition session
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('🎤 Listening...');
        setIsListening(true);
        setError(null);
      };
      
      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log('📝 Transcript:', transcript);
        
        if (transcript && transcript.length > 3) {
          try {
            console.log('🌍 Translating to:', preferredLanguage);
            const result = await translateText(transcript, preferredLanguage);
            setDetectedLanguage(result.detectedLanguage);
            
            // Add to history
            const historyItem = {
              id: Date.now(),
              originalText: transcript,
              translatedText: result.translatedText,
              detectedLanguage: result.detectedLanguage,
              targetLanguage: preferredLanguage,
              timestamp: new Date()
            };
            
            setTranslationHistory(prev => [...prev.slice(-9), historyItem]);
            
            // Speak translation
            console.log('🔊 Speaking:', result.translatedText);
            await speakText(result.translatedText, preferredLanguage);
            
            console.log('✅ Translation completed');
            
          } catch (error) {
            console.error('❌ Translation failed:', error);
            setError(`Translation failed: ${error.message}`);
          }
        }
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('🔇 Recognition ended');
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setError('Failed to start speech recognition: ' + error.message);
      setIsListening(false);
    }
  }, [preferredLanguage]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setTranslationHistory([]);
  }, []);

  return {
    isListening,
    detectedLanguage,
    translationHistory,
    error,
    startListening,
    stopListening,
    clearHistory
  };
};
