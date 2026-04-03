import { useState, useRef, useCallback, useEffect } from 'react';

export const useDynamicTranslation = (preferredLanguage = 'off') => {
  const [isListening, setIsListening] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [translationHistory, setTranslationHistory] = useState([]);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const isActiveRef = useRef(false);

  // Initialize speech recognition with proper state management
  useEffect(() => {
    let recognition = null;
    let isActive = false;
    let restartTimeout = null;

    const startRecognition = async () => {
      if (preferredLanguage === 'off' || !isActive) return;

      // Check if browser supports speech recognition
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setError('Speech recognition not supported in this browser');
        return;
      }

      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone permission granted');
      } catch (permError) {
        console.error('❌ Microphone permission denied:', permError);
        setError('Microphone permission required for translation');
        return;
      }

      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US'; // Start with English, auto-detect later
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          console.log('🎤 Speech recognition started for language:', preferredLanguage);
          setIsListening(true);
          setError(null);
        };
        
        recognition.onresult = async (event) => {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim();
            console.log('📝 Transcript:', transcript);
            
            if (transcript && transcript.length > 3) {
              await handleTranslation(transcript);
            }
          }
        };
        
        recognition.onerror = (event) => {
          console.error('❌ Speech recognition error:', event.error);
          setIsListening(false);
          
          // Only show error for non-aborted errors
          if (event.error !== 'aborted' && event.error !== 'network') {
            setError(`Speech recognition error: ${event.error}`);
          }
          
          // Don't restart on certain errors
          if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
            isActive = false;
            setError('Microphone permission denied. Please allow microphone access.');
          }
        };
        
        recognition.onend = () => {
          console.log('🔇 Speech recognition ended');
          setIsListening(false);
          
          // Restart only if still active and no critical errors
          if (isActive && preferredLanguage !== 'off') {
            restartTimeout = setTimeout(() => {
              if (isActive) {
                startRecognition();
              }
            }, 2000); // 2 second delay between restarts
          }
        };
        
        recognitionRef.current = recognition;
        recognition.start();
        
      } catch (error) {
        console.error('Failed to create recognition:', error);
        setError('Failed to start speech recognition');
        setIsListening(false);
      }
    };

    // Only start if translation is enabled
    if (preferredLanguage !== 'off') {
      isActive = true;
      isActiveRef.current = true;
      
      // Delay initial start to avoid conflicts
      const initTimeout = setTimeout(() => {
        if (isActive) {
          startRecognition();
        }
      }, 1000);

      return () => {
        clearTimeout(initTimeout);
      };
    }

    // Cleanup function
    return () => {
      isActive = false;
      isActiveRef.current = false;
      
      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }
      
      if (recognition) {
        try {
          recognition.stop();
          recognition = null;
        } catch (error) {
          console.log('Cleanup error:', error);
        }
      }
      
      recognitionRef.current = null;
      setIsListening(false);
    };
  }, [preferredLanguage]);

  // Google Translate API function
  const translateText = async (text, targetLang) => {
    try {
      // Auto-detect source language
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Parse response
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

      // Cancel any ongoing speech
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

  // Handle translation process
  const handleTranslation = useCallback(async (originalText) => {
    if (preferredLanguage === 'off' || !originalText || originalText.length < 3) return;

    try {
      console.log('🌍 Translating:', originalText, 'to', preferredLanguage);
      
      const result = await translateText(originalText, preferredLanguage);
      setDetectedLanguage(result.detectedLanguage);
      
      // Only proceed if translation is different from original (avoid translating same language)
      if (result.translatedText && result.translatedText.toLowerCase() !== originalText.toLowerCase()) {
        // Add to history
        const historyItem = {
          id: Date.now(),
          originalText,
          translatedText: result.translatedText,
          detectedLanguage: result.detectedLanguage,
          targetLanguage: preferredLanguage,
          timestamp: new Date()
        };
        
        setTranslationHistory(prev => [...prev.slice(-9), historyItem]); // Keep last 10
        
        // Speak the translated text
        console.log('🔊 Speaking translation:', result.translatedText);
        await speakText(result.translatedText, preferredLanguage);
        
        console.log('✅ Translation completed:', result.translatedText);
      } else {
        console.log('⚠️ Same language detected, skipping translation');
      }
      
    } catch (error) {
      console.error('❌ Translation failed:', error);
      setError(`Translation failed: ${error.message}`);
    }
  }, [preferredLanguage]);

  // Clear history
  const clearHistory = useCallback(() => {
    setTranslationHistory([]);
  }, []);

  return {
    isListening,
    detectedLanguage,
    translationHistory,
    error,
    clearHistory
  };
};
