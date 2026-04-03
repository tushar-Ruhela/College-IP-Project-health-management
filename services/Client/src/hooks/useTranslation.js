import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const TRANSLATION_SERVER_URL = 'http://localhost:5000';

export const useTranslation = (roomId, myLanguage, targetLanguage, enabled = false) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationHistory, setTranslationHistory] = useState([]);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize translation socket connection
  useEffect(() => {
    if (!enabled || !roomId) return;

    console.log('🔌 Connecting to translation service...');
    socketRef.current = io(TRANSLATION_SERVER_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Connected to translation service');
      setIsConnected(true);
      setError(null);
      
      // Join translation room
      socket.emit('join_translation_room', {
        roomId,
        userLanguage: myLanguage,
        targetLanguage: targetLanguage
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from translation service');
      setIsConnected(false);
    });

    socket.on('joined_translation_room', (data) => {
      console.log('📥 Joined translation room:', data.roomId);
    });

    socket.on('translation_result', (data) => {
      console.log('🔄 Received translation:', data);
      
      // Add to translation history
      setTranslationHistory(prev => [...prev, {
        id: Date.now(),
        originalText: data.originalText,
        translatedText: data.translatedText,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        timestamp: new Date(),
        senderId: data.senderId
      }]);

      // Play translated audio
      if (data.audioData) {
        playTranslatedAudio(data.audioData);
      }
    });

    socket.on('translation_error', (data) => {
      console.error('❌ Translation error:', data.error);
      setError(data.error);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setError('Failed to connect to translation service');
    });

    return () => {
      if (socket) {
        socket.emit('leave_translation_room', { roomId });
        socket.disconnect();
      }
      stopRecording();
    };
  }, [enabled, roomId, myLanguage, targetLanguage]);

  // Play translated audio
  const playTranslatedAudio = useCallback((audioBase64) => {
    try {
      // Convert base64 to blob
      const audioData = atob(audioBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
      
      // Create audio element and play
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioBlob);
      audio.play().catch(e => console.error('Audio play error:', e));
      
      // Clean up URL after playing
      audio.onended = () => URL.revokeObjectURL(audio.src);
    } catch (error) {
      console.error('❌ Error playing translated audio:', error);
    }
  }, []);

  // Start recording audio for translation
  const startRecording = useCallback(async () => {
    if (!enabled || !isConnected || isRecordingRef.current) return;

    try {
      console.log('🎤 Starting audio recording for translation...');
      
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
      isRecordingRef.current = true;
      setIsTranslating(true);
      
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Failed to start recording: ' + error.message);
    }
  }, [enabled, isConnected]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    console.log('⏹️ Stopping audio recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    isRecordingRef.current = false;
    setIsTranslating(false);
    
    console.log('✅ Recording stopped');
  }, []);

  // Send audio data for translation
  const sendAudioForTranslation = useCallback(async (audioBlob) => {
    if (!socketRef.current || !isConnected) return;

    try {
      console.log('📤 Sending audio for translation...');
      
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      socketRef.current.emit('audio_for_translation', {
        roomId,
        audioData: base64Audio,
        sourceLanguage: myLanguage,
        targetLanguage: targetLanguage,
        senderId: socketRef.current.id
      });
      
      console.log('✅ Audio sent for translation');
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      setError('Failed to send audio for translation');
    }
  }, [roomId, myLanguage, targetLanguage, isConnected]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  // Clear translation history
  const clearHistory = useCallback(() => {
    setTranslationHistory([]);
  }, []);

  return {
    isConnected,
    isTranslating,
    translationHistory,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    clearHistory,
    isRecording: isRecordingRef.current
  };
};
