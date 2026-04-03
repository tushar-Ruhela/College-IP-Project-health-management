import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone,
  MessageSquare,
  FileText,
  User,
  Clock,
  Pill,
  Send,
  Minimize2,
  Maximize2,
  Settings,
  Activity,
  Heart,
  Thermometer,
  AlertTriangle,
  Calendar,
  MapPin,
  UserPlus,
  Users,
  Shield,
  Stethoscope,
  Bot,
  FileAudio,
  Languages
} from "lucide-react";
import "./Room.css";
import SimpleLanguageSelector from "../components/SimpleLanguageSelector";
import { useSimpleTranslationFallback } from "../hooks/useSimpleTranslationFallback";

const baseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const socket = io(baseUrl, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000,
});

export default function MedicalRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detect if AI-only mode from URL path
  const isAIOnlyMode = location.pathname.includes('/onlyai/');

  // Core video call state
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [remoteVideoStatus, setRemoteVideoStatus] = useState({});

  // Role-based state
  const [userRole, setUserRole] = useState("patient");
  const [isFirstUser, setIsFirstUser] = useState(false);
  const isDoctor = userRole === "doctor";
  const [showDoctorPanel, setShowDoctorPanel] = useState(true);
  const [activeTab, setActiveTab] = useState(isAIOnlyMode ? "chat" : "patient");
  const [sessionStartTime] = useState(new Date());
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: isAIOnlyMode 
        ? "🤖 AI Voice Agent Initialized. Click 'Start AI Conversation' to begin."
        : "🏥 Medical consultation room initialized. Secure connection established.",
      sender: "System",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [prescription, setPrescription] = useState({
    medications: "",
    instructions: "",
    followUp: ""
  });

  // AI Bot State (for transcription in normal mode)
  const [aiTranscript, setAiTranscript] = useState([]);
  const [isAIBotActive, setIsAIBotActive] = useState(false);
  const [aiStatus, setAiStatus] = useState("inactive");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const recognitionActiveRef = useRef(false);
  
  // AI Voice Agent State (for AI-only mode - Real-time like Gemini Live)
  const [aiVoiceActive, setAiVoiceActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [aiVoiceStream, setAiVoiceStream] = useState(null);
  const aiAudioContextRef = useRef(null);
  const aiAudioElementRef = useRef(null);
  const geminiWsRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Patient data
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Translation state
  const [myPreferredLanguage, setMyPreferredLanguage] = useState('off');
  const [shouldMuteRemoteAudio, setShouldMuteRemoteAudio] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  // Initialize simple translation fallback
  const {
    isListening,
    detectedLanguage,
    translationHistory,
    error: translationError,
    startListening,
    stopListening,
    clearHistory
  } = useSimpleTranslationFallback(myPreferredLanguage);

  // Core video functionality refs
  const localVideoRef = useRef();
  const localStream = useRef(null);
  const peerConnections = useRef({});
  const remoteVideoRefs = useRef({});
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});

  // Gemini API Configuration
  const GEMINI_API_KEY = "AIzaSyDCtWQnbvdsY7JVNapc0vJxpl8UNN76iz0";
  const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

  // Mute remote audio when translation is enabled
  useEffect(() => {
    const shouldMute = myPreferredLanguage !== 'off';
    setShouldMuteRemoteAudio(shouldMute);
    
    // Mute/unmute all remote video elements
    Object.values(remoteVideoRefs.current).forEach(videoRef => {
      if (videoRef && videoRef.current) {
        videoRef.current.muted = shouldMute;
        console.log(`Remote audio ${shouldMute ? 'muted' : 'unmuted'} for translation`);
      }
    });
  }, [myPreferredLanguage]);

  // Audio level detection setup - FIXED
  const setupAudioAnalyser = useCallback((userId, stream) => {
    try {
      // Only create if doesn't exist
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 32;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analysersRef.current[userId] = analyser;
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
    }
  }, []);

  // Initialize Speech Recognition for transcription (normal mode only)
  useEffect(() => {
    if (isAIOnlyMode) return; // Don't initialize for AI-only mode

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        if (finalTranscript) {
          const timestamp = new Date().toLocaleTimeString();
          const speaker = isDoctor ? "Doctor" : "Patient";
          
          setAiTranscript(prev => [...prev, {
            id: Date.now(),
            speaker: speaker,
            text: finalTranscript.trim(),
            timestamp: timestamp
          }]);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        recognitionActiveRef.current = false;
      };

      recognitionRef.current.onend = () => {
        recognitionActiveRef.current = false;
        if (isAIBotActive) {
          // Restart if still active
          try {
            recognitionRef.current.start();
            recognitionActiveRef.current = true;
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      };
    }

    return () => {
      if (recognitionRef.current && recognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionActiveRef.current = false;
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    };
  }, [isDoctor, isAIBotActive, isAIOnlyMode]);

  // Toggle AI Transcription Bot (normal mode)
  const toggleAITranscriptionBot = () => {
    if (!isAIBotActive) {
      // Start transcription
      setIsAIBotActive(true);
      setAiStatus("active");
      if (recognitionRef.current && !recognitionActiveRef.current) {
        try {
          recognitionRef.current.start();
          recognitionActiveRef.current = true;
          setAiTranscript(prev => [...prev, {
            id: Date.now(),
            speaker: "System",
            text: "🎙️ AI Transcription Bot started. Recording conversation...",
            timestamp: new Date().toLocaleTimeString()
          }]);
        } catch (error) {
          console.error('Error starting recognition:', error);
        }
      }
    } else {
      // Stop transcription
      setIsAIBotActive(false);
      setAiStatus("inactive");
      if (recognitionRef.current && recognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionActiveRef.current = false;
          setAiTranscript(prev => [...prev, {
            id: Date.now(),
            speaker: "System",
            text: "🛑 AI Transcription Bot stopped.",
            timestamp: new Date().toLocaleTimeString()
          }]);
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    }
  };

  // Real-time AI Voice Agent Functions (AI-only mode)
  
  // Start AI Voice Conversation (like Gemini Live)
  const startAIVoiceConversation = async () => {
    if (!GEMINI_API_KEY) {
      alert("Please configure GEMINI_API_KEY in your .env file");
      return;
    }

    try {
      setAiVoiceActive(true);
      setAiStatus("connecting");

      // Initialize audio context for AI voice
      if (!aiAudioContextRef.current) {
        aiAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Create audio element for AI voice output
      if (!aiAudioElementRef.current) {
        aiAudioElementRef.current = new Audio();
        aiAudioElementRef.current.autoplay = true;
      }

      // Add AI greeting message
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: "👋 Hello! I'm Dr. Nirogya, your AI health assistant. How can I help you today?",
        sender: "Dr. Nirogya",
        timestamp: new Date().toLocaleTimeString(),
        isAI: true
      }]);

      // Speak the greeting
      speakText("Hello! I'm Dr. Nirogya, your AI health assistant. How can I help you today?");

      setAiStatus("ready");

      // Initialize speech recognition for continuous listening
      if (!recognitionRef.current) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setAiStatus("listening");
          recognitionActiveRef.current = true;
        };

        recognitionRef.current.onresult = async (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          
          // Add user message
          setChatMessages(prev => [...prev, {
            id: Date.now(),
            text: transcript,
            sender: "You",
            timestamp: new Date().toLocaleTimeString()
          }]);

          // Add to transcript
          setAiTranscript(prev => [...prev, {
            id: Date.now(),
            speaker: "You",
            text: transcript,
            timestamp: new Date().toLocaleTimeString()
          }]);

          // Get AI response
          await getAIVoiceResponse(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setAiStatus("error");
          }
        };

        recognitionRef.current.onend = () => {
          recognitionActiveRef.current = false;
          // Auto-restart if still active
          if (aiVoiceActive && !isAISpeaking) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error restarting recognition:', error);
            }
          }
        };
      }

      // Start listening
      if (!recognitionActiveRef.current) {
        recognitionRef.current.start();
      }

    } catch (error) {
      console.error('Error starting AI voice conversation:', error);
      setAiStatus("error");
      alert('Failed to start AI voice conversation. Please check your setup.');
    }
  };

  // Stop AI Voice Conversation
  const stopAIVoiceConversation = () => {
    setAiVoiceActive(false);
    setAiStatus("inactive");
    
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionActiveRef.current = false;
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: "👋 Conversation ended. Thank you for talking with Dr. Nirogya!",
      sender: "System",
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Get AI Voice Response using Gemini API
// Get AI Voice Response using Gemini API with Error Handling
const getAIVoiceResponse = async (userMessage) => {
  setAiStatus("thinking");
  setIsAISpeaking(true);

  // Stop listening while AI is speaking
  if (recognitionRef.current && recognitionActiveRef.current) {
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  try {
    const systemPrompt = `You are Dr. Nirogya, a friendly and professional AI health assistant in a video consultation.

Your role:
- Answer general health-related questions with empathy and clarity
- Provide wellness tips, lifestyle advice, and preventive care information
- Offer mental health support and stress management techniques
- Give first-aid guidance for minor issues
- ALWAYS recommend consulting a real doctor for serious medical concerns, diagnosis, or treatment

Response guidelines:
- Keep responses concise (2-3 sentences, maximum 50 words)
- Use a warm, conversational, and professional tone
- Be encouraging and supportive
- Never diagnose or prescribe medications
- Prioritize patient safety above all

Example responses:
User: "I have a headache and fever of 101°F"
Dr. Nirogya: "I'm sorry you're not feeling well. A fever of 101°F with headache could indicate an infection. Please rest, stay hydrated, take over-the-counter fever reducers like acetaminophen, and consult your doctor if symptoms worsen or persist beyond 2-3 days."`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser: ${userMessage}\n\nDr. Nirogya:`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.95,
          }
        })
      }
    );

    // Handle rate limit errors
    if (response.status === 429) {
      console.error('Rate limit exceeded (429)');
      
      // Fallback response for health queries
      const fallbackResponse = getFallbackHealthResponse(userMessage);
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: fallbackResponse,
        sender: "Dr. Nirogya",
        timestamp: new Date().toLocaleTimeString(),
        isAI: true
      }]);

      // Add to transcript
      setAiTranscript(prev => [...prev, {
        id: Date.now(),
        speaker: "Dr. Nirogya",
        text: fallbackResponse,
        timestamp: new Date().toLocaleTimeString()
      }]);

      // Speak the response
      await speakText(fallbackResponse);

      setAiStatus("listening");
      setIsAISpeaking(false);

      // Restart listening
      if (aiVoiceActive && recognitionRef.current && !recognitionActiveRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }, 500);
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   "I'm sorry, I didn't understand that. Could you please rephrase?";

    // Add AI response to chat
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: aiText,
      sender: "Dr. Nirogya",
      timestamp: new Date().toLocaleTimeString(),
      isAI: true
    }]);

    // Add to transcript
    setAiTranscript(prev => [...prev, {
      id: Date.now(),
      speaker: "Dr. Nirogya",
      text: aiText,
      timestamp: new Date().toLocaleTimeString()
    }]);

    // Speak the response
    await speakText(aiText);

    setAiStatus("listening");
    setIsAISpeaking(false);

    // Restart listening after speaking
    if (aiVoiceActive && recognitionRef.current && !recognitionActiveRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }, 500);
    }

  } catch (error) {
    console.error('Error getting AI response:', error);
    setAiStatus("error");
    setIsAISpeaking(false);
    
    // Provide a helpful fallback response
    const errorResponse = "I'm experiencing technical difficulties right now. For immediate health concerns, please contact your doctor or visit the emergency room. Is there something specific I can help you with?";
    
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: errorResponse,
      sender: "Dr. Nirogya",
      timestamp: new Date().toLocaleTimeString(),
      isAI: true
    }]);

    await speakText(errorResponse);

    // Restart listening
    if (aiVoiceActive && recognitionRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }, 1000);
    }
  }
};

// Fallback health response function (when API is rate-limited)
const getFallbackHealthResponse = (userMessage) => {
  const messageLower = userMessage.toLowerCase();
  
  // Headache and fever
  if ((messageLower.includes('headache') || messageLower.includes('head')) && 
      (messageLower.includes('fever') || messageLower.includes('temperature'))) {
    return "I'm sorry you're not feeling well. A fever with headache could indicate an infection. Please rest, stay hydrated, take acetaminophen or ibuprofen for fever, and consult your doctor if symptoms worsen or persist beyond 2-3 days.";
  }
  
  // Fever only
  if (messageLower.includes('fever') || messageLower.includes('temperature')) {
    return "For a fever, rest and stay hydrated. You can take over-the-counter fever reducers like acetaminophen. If fever exceeds 103°F or lasts more than 3 days, please see a doctor immediately.";
  }
  
  // Headache only
  if (messageLower.includes('headache') || messageLower.includes('head pain')) {
    return "For headaches, try resting in a quiet, dark room, staying hydrated, and taking over-the-counter pain relief. If severe or persistent, please consult your doctor to rule out serious causes.";
  }
  
  // Cold/Cough
  if (messageLower.includes('cold') || messageLower.includes('cough') || messageLower.includes('sore throat')) {
    return "For cold symptoms, get plenty of rest, stay hydrated, and use over-the-counter medications as needed. If symptoms worsen or persist beyond 10 days, please see your doctor.";
  }
  
  // Stomach/digestive issues
  if (messageLower.includes('stomach') || messageLower.includes('nausea') || messageLower.includes('vomit')) {
    return "For stomach issues, try eating bland foods, staying hydrated with clear fluids, and resting. If symptoms are severe or persist, please consult your doctor.";
  }
  
  // Pain
  if (messageLower.includes('pain') || messageLower.includes('hurt')) {
    return "I understand you're experiencing pain. Over-the-counter pain relievers can help, but if the pain is severe, persistent, or accompanied by other symptoms, please see a doctor for proper evaluation.";
  }
  
  // Stress/anxiety
  if (messageLower.includes('stress') || messageLower.includes('anxiety') || messageLower.includes('worried')) {
    return "It's important to address stress and anxiety. Try deep breathing exercises, regular exercise, and adequate sleep. If feelings persist, please consider talking to a mental health professional.";
  }
  
  // General health question
  return "I'm here to help with general health questions. For your specific concern, I recommend staying hydrated, getting adequate rest, and consulting with your doctor for personalized medical advice and proper diagnosis.";
};


// Alternative: Use with retry logic and exponential backoff
const getAIVoiceResponseWithRetry = async (userMessage, retryCount = 0) => {
  const maxRetries = 2;
  const backoffDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

  setAiStatus("thinking");
  setIsAISpeaking(true);

  // Stop listening while AI is speaking
  if (recognitionRef.current && recognitionActiveRef.current) {
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  try {
    const systemPrompt = `You are Dr. Nirogya, a friendly AI health assistant. Answer health questions concisely (max 50 words), recommend seeing a doctor for serious issues, and prioritize patient safety.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nUser: ${userMessage}\n\nDr. Nirogya:`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.95,
          }
        })
      }
    );

    // Handle 429 Rate Limit with fallback
    if (response.status === 429) {
      console.warn(`Rate limit hit (429). Using fallback response.`);
      
      const fallbackResponse = getFallbackHealthResponse(userMessage);
      
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: fallbackResponse,
        sender: "Dr. Nirogya",
        timestamp: new Date().toLocaleTimeString(),
        isAI: true
      }]);

      setAiTranscript(prev => [...prev, {
        id: Date.now(),
        speaker: "Dr. Nirogya",
        text: fallbackResponse,
        timestamp: new Date().toLocaleTimeString()
      }]);

      await speakText(fallbackResponse);
      setAiStatus("listening");
      setIsAISpeaking(false);

      // Restart listening
      if (aiVoiceActive && recognitionRef.current && !recognitionActiveRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }, 500);
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   "Could you please rephrase that?";

    // Success - display and speak response
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: aiText,
      sender: "Dr. Nirogya",
      timestamp: new Date().toLocaleTimeString(),
      isAI: true
    }]);

    setAiTranscript(prev => [...prev, {
      id: Date.now(),
      speaker: "Dr. Nirogya",
      text: aiText,
      timestamp: new Date().toLocaleTimeString()
    }]);

    await speakText(aiText);
    setAiStatus("listening");
    setIsAISpeaking(false);

    // Restart listening
    if (aiVoiceActive && recognitionRef.current && !recognitionActiveRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }, 500);
    }

  } catch (error) {
    console.error(`Error getting AI response (attempt ${retryCount + 1}):`, error);
    
    // Retry with backoff if under max retries
    if (retryCount < maxRetries) {
      console.log(`Retrying in ${backoffDelay}ms...`);
      setTimeout(() => {
        getAIVoiceResponseWithRetry(userMessage, retryCount + 1);
      }, backoffDelay);
      return;
    }
    
    // Max retries exceeded - use fallback
    setAiStatus("error");
    setIsAISpeaking(false);
    
    const errorResponse = getFallbackHealthResponse(userMessage);
    
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      text: errorResponse,
      sender: "Dr. Nirogya",
      timestamp: new Date().toLocaleTimeString(),
      isAI: true
    }]);

    await speakText(errorResponse);

    // Restart listening
    if (aiVoiceActive && recognitionRef.current) {
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }, 1000);
    }
  }
};


  // Text-to-Speech function
  const speakText = (text) => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        // Select a natural-sounding voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Google') || 
          voice.name.includes('Natural') ||
          voice.name.includes('Premium')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  // Detect active speaker
  useEffect(() => {
    if (Object.keys(analysersRef.current).length === 0) return;
    const interval = setInterval(() => {
      const dataArray = new Uint8Array(32);
      let maxVolume = 0;
      let loudestUserId = null;
      Object.entries(analysersRef.current).forEach(([userId, analyser]) => {
        try {
          analyser.getByteFrequencyData(dataArray);
          const volume = Math.max(...dataArray);
          if (volume > maxVolume && volume > 30) {
            maxVolume = volume;
            loudestUserId = userId;
          }
        } catch (error) {
          // Analyser might be disconnected
        }
      });
      setActiveSpeaker(loudestUserId);
    }, 200);
    return () => clearInterval(interval);
  }, [remoteUsers]);

  // Function to deduplicate summaries by ID
  const deduplicateSummaries = (summaries) => {
    if (!summaries || !Array.isArray(summaries)) return [];
    
    const uniqueSummaries = [];
    const seenIds = new Set();
    
    for (const summary of summaries) {
      if (summary.id && !seenIds.has(summary.id)) {
        seenIds.add(summary.id);
        uniqueSummaries.push(summary);
      }
    }
    
    return uniqueSummaries;
  };

  // Function to fetch patient data from API
  const fetchPatientData = async (ticketId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://sih-2025-fc4t.onrender.com/api/tickets/${ticketId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patient data: ${response.status}`);
      }
      
      const data = await response.json();
      
      const uniqueSummaries = deduplicateSummaries(data.summaries);
      
      const transformedPatientInfo = {
        name: data.name || "Unknown Patient",
        age: calculateAge(data.dateOfBirth) || "N/A",
        id: data._id,
        mrn: data._id,
        phoneNumber: data.phoneNumber,
        gender: data.gender || "Not specified",
        condition: "Healthcare Consultation",
        chiefComplaint: uniqueSummaries?.[0]?.aiAnalysis?.shortSummary || "Medical consultation requested",
        summaries: uniqueSummaries,
        prescriptions: data.prescriptions || [],
        dob: data.dateOfBirth || "Not available",
        email: `${data.name?.toLowerCase()?.replace(' ', '.')}@email.com` || "not.available@email.com",
        address: "Address not available",
        emergencyContact: {
          name: "Not available",
          phone: "Not available",
          relationship: "Not specified"
        },
        insurance: {
          provider: "Insurance info not available",
          policyNumber: "N/A",
          groupNumber: "N/A",
          copay: "N/A"
        },
        lastVisit: getLastVisitDate(uniqueSummaries),
        nextAppointment: getNextAppointmentDate(),
        primaryPhysician: "Dr. Attending Physician",
        medications: [],
        allergies: [],
        vitals: {
          bloodPressure: "Not recorded",
          heartRate: "Not recorded",
          temperature: "Not recorded",
          respiratoryRate: "Not recorded",
          oxygenSat: "Not recorded",
          height: "Not recorded",
          weight: "Not recorded",
          bmi: "Not recorded",
          painScale: "Not recorded",
          lastUpdated: new Date().toLocaleString()
        },
        labResults: []
      };
      
      setPatientInfo(transformedPatientInfo);
      
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: `🩺 Patient records loaded: ${transformedPatientInfo.name} (ID: ${transformedPatientInfo.id})`,
        sender: "System",
        timestamp: new Date().toLocaleTimeString()
      }]);
      
    } catch (err) {
      console.error("Error fetching patient data:", err);
      setError(err.message);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        text: `❌ Error loading patient data: ${err.message}`,
        sender: "System",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for data transformation
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getLastVisitDate = (summaries) => {
    if (!summaries || summaries.length === 0) return "No previous visits";
    return "Recent consultation available";
  };

  const getNextAppointmentDate = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toLocaleDateString();
  };

  // Effect to fetch patient data when room loads and user is doctor
  useEffect(() => {
    if (roomId && isDoctor && !isAIOnlyMode) {
      fetchPatientData(roomId);
    }
  }, [roomId, isDoctor, isAIOnlyMode]);

  // Effect to handle window resizing
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ICE server configuration
  const iceConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
  };

  // Create peer connection
  const createPeerConnection = useCallback((remoteUserId) => {
    if (peerConnections.current[remoteUserId]) return;
    
    console.log("Creating peer connection for:", remoteUserId);
    const pc = new RTCPeerConnection(iceConfig);
    peerConnections.current[remoteUserId] = pc;
    
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }
    
    pc.ontrack = (event) => {
      console.log("Received track from:", remoteUserId);
      if (event.streams && event.streams[0]) {
        if (remoteVideoRefs.current[remoteUserId]) {
          remoteVideoRefs.current[remoteUserId].srcObject = event.streams[0];
          // Mute remote audio if translation is enabled
          remoteVideoRefs.current[remoteUserId].muted = shouldMuteRemoteAudio;
          setupAudioAnalyser(remoteUserId, event.streams[0]);
        }
        const videoTrack = event.streams[0].getVideoTracks()[0];
        if (videoTrack) {
          setRemoteVideoStatus((prev) => ({
            ...prev,
            [remoteUserId]: videoTrack.enabled,
          }));
          videoTrack.onmute = () => {
            setRemoteVideoStatus((prev) => ({
              ...prev,
              [remoteUserId]: false,
            }));
          };
          videoTrack.onunmute = () => {
            setRemoteVideoStatus((prev) => ({ ...prev, [remoteUserId]: true }));
          };
        }
      }
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", {
          to: remoteUserId,
          data: { type: "candidate", candidate: event.candidate },
        });
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log("Connection state changed:", pc.connectionState);
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        if (peerConnections.current[remoteUserId]) {
          peerConnections.current[remoteUserId].close();
          delete peerConnections.current[remoteUserId];
        }
        setRemoteUsers((prev) => prev.filter((id) => id !== remoteUserId));
        delete analysersRef.current[remoteUserId];
        setRemoteVideoStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[remoteUserId];
          return newStatus;
        });
      }
    };
    
    pc.onnegotiationneeded = async () => {
      try {
        if (socket.id > remoteUserId) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("signal", {
            to: remoteUserId,
            data: { type: "offer", sdp: pc.localDescription },
          });
        }
      } catch (err) {
        console.error("Error during negotiation:", err);
      }
    };
  }, [setupAudioAnalyser]);

  // Core setup effect
  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setupAudioAnalyser("local", stream);
        socket.connect();
      } catch (err) {
        console.error("Failed to get media:", err);
        alert("Camera and microphone access required!");
        navigate("/");
      }
    };

    const onConnect = () => {
      console.log("Connected to server");
      setConnectionStatus("connected");
      socket.emit("join-room", roomId, { isAIOnlyMode });
    };

    const onDisconnect = () => {
      console.log("Disconnected from server");
      setConnectionStatus("disconnected");
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      setRemoteUsers([]);
      analysersRef.current = {};
    };

    const onAllUsers = (usersList) => {
      console.log("Existing users:", usersList);
      setRemoteUsers(usersList.filter(id => id !== socket.id));
      usersList.forEach(userId => {
        if (userId !== socket.id) {
          createPeerConnection(userId);
        }
      });
    };

    const onUserRole = ({ role, isFirst }) => {
      console.log("My role:", role, "First user:", isFirst);
      setUserRole(role);
      setIsFirstUser(isFirst);
      
      if (role === "doctor" && !isAIOnlyMode) {
        fetchPatientData(roomId);
      }
    };

    const onUserJoined = (userId) => {
      console.log("User joined:", userId);
      setRemoteUsers(prev => [...prev, userId]);
      createPeerConnection(userId);
      
      if (isDoctor && patientInfo && !isAIOnlyMode) {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          text: `👤 Patient ${patientInfo.name} has joined the consultation room.`,
          sender: "System",
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };

    const onUserDisconnected = (userId) => {
      console.log("User disconnected:", userId);
      if (peerConnections.current[userId]) {
        peerConnections.current[userId].close();
        delete peerConnections.current[userId];
      }
      setRemoteUsers(prev => prev.filter(id => id !== userId));
      delete analysersRef.current[userId];
      setRemoteVideoStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[userId];
        return newStatus;
      });
    };

    const onSignal = async ({ from, data }) => {
      console.log("Signal received from:", from, "type:", data.type);
      const pc = peerConnections.current[from];
      if (!pc) return;
      try {
        if (data.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal", { to: from, data: { type: "answer", sdp: pc.localDescription } });
        } else if (data.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === "candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("Signal error:", err);
      }
    };

    setupMedia();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("all-users", onAllUsers);
    socket.on("user-role", onUserRole);
    socket.on("user-joined", onUserJoined);
    socket.on("user-disconnected", onUserDisconnected);
    socket.on("signal", onSignal);

    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current && recognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("all-users", onAllUsers);
      socket.off("user-role", onUserRole);
      socket.off("user-joined", onUserJoined);
      socket.off("user-disconnected", onUserDisconnected);
      socket.off("signal", onSignal);
      if (socket.connected) socket.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [roomId, navigate, createPeerConnection, setupAudioAnalyser, isDoctor, isAIOnlyMode]);

  // Medical functionality handlers
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: isDoctor ? "Doctor" : "Patient",
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, message]);
      setNewMessage("");
    }
  };

  const handlePrescriptionSave = () => {
    if (!patientInfo) {
      alert("Please wait for patient data to load before creating a prescription.");
      return;
    }
    console.log("Prescription saved:", prescription);
    alert(`✅ Digital Prescription Saved Successfully!\n\n📋 Patient: ${patientInfo.name}\n🏥 Provider: Dr. Attending Physician\n📅 Date: ${new Date().toLocaleDateString()}\n🏪 Pharmacy: To be specified`);
  };

  // Core control handlers
  const handleHangUp = () => {
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    socket.disconnect();
    navigate("/");
  };

  const toggleAudio = () => {
    if (localStream.current) {
      localStream.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsMuted((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsVideoEnabled((prev) => !prev);
    }
  };

  // Helper functions
  const getGridClass = () => {
    const totalParticipants = remoteUsers.length + 1 + (isAIOnlyMode && aiVoiceActive ? 1 : 0);
    if (totalParticipants <= 1) return "participants-1";
    if (totalParticipants === 2) return "participants-2";
    if (totalParticipants === 3) return "participants-3";
    if (totalParticipants === 4) return "participants-4";
    if (totalParticipants <= 6) return "participants-6";
    if (totalParticipants <= 9) return "participants-9";
    return "participants-many";
  };

  const getVideoTileClass = (userId) => {
    let classes = "video-tile";
    if (userId === "local") classes += " local";
    if (userId === "ai-agent") classes += " ai-agent";
    if (activeSpeaker === userId) classes += " active-speaker";
    return classes;
  };

  const getVideoClass = (userId) => {
    let classes = "video-element";
    if (userId === "local") classes += " local";
    if (activeSpeaker && activeSpeaker !== userId && userId !== "local")
      classes += " dimmed";
    return classes;
  };

  const getSessionDuration = () => {
    const now = new Date();
    const diff = now - sessionStartTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [sessionDuration, setSessionDuration] = useState("00:00");
  
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(getSessionDuration());
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  return (
    <div className="room-container">
      {/* Enhanced Header */}
      <div className="room-header" style={{ 
        background: isAIOnlyMode 
          ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '1rem 2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 className="room-title" style={{ 
                color: 'white', 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                {isAIOnlyMode ? "🤖 AI Voice Agent Room" : "🏥 Nirogya Consultation Room"}: {roomId}
              </h2>
              <div className={`status-indicator ${connectionStatus}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                backdropFilter: 'blur(10px)'
              }}>
                <div className={`status-dot ${connectionStatus}`} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: connectionStatus === "connected" ? '#10b981' : '#f59e0b'
                }} />
                <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>
                  {connectionStatus === "connected" ? "Connected" : "Connecting..."}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.25)', 
                padding: '0.5rem 1rem', 
                borderRadius: '1rem', 
                color: 'white', 
                fontSize: '0.875rem', 
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                👥 {remoteUsers.length + 1 + (isAIOnlyMode && aiVoiceActive ? 1 : 0)} participants
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.25)', 
                padding: '0.5rem 1rem', 
                borderRadius: '1rem', 
                color: 'white', 
                fontSize: '0.875rem', 
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                ⏱️ {sessionDuration}
              </div>
              {isAIOnlyMode ? (
                <div style={{ 
                  background: aiVoiceActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '1rem', 
                  color: 'white', 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  🤖 {aiVoiceActive ? 'AI ACTIVE' : 'AI INACTIVE'}
                </div>
              ) : (
                <div style={{ 
                  background: isDoctor 
                    ? 'rgba(59, 130, 246, 0.3)' 
                    : 'rgba(16, 185, 129, 0.3)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '1rem', 
                  color: 'white', 
                  fontSize: '0.875rem', 
                  fontWeight: '600',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}>
                  {isDoctor ? "👨‍⚕️ DOCTOR" : "👤 PATIENT"}
                </div>
              )}
              
              {/* Language Selector */}
              <SimpleLanguageSelector
                selectedLanguage={myPreferredLanguage}
                onLanguageChange={setMyPreferredLanguage}
                className="ml-4"
                label="Listen in"
                isListening={isListening}
                error={translationError}
              />
              
              {/* Translation Controls */}
              {myPreferredLanguage !== 'off' && (
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={!!translationError}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1.25rem',
                      minWidth: '120px',
                      height: '40px',
                      background: isListening 
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: translationError ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isListening 
                        ? '0 3px 15px rgba(239, 68, 68, 0.4)'
                        : '0 3px 15px rgba(16, 185, 129, 0.4)',
                      backdropFilter: 'blur(10px)',
                      opacity: translationError ? 0.5 : 1,
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (!translationError) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = isListening 
                          ? '0 4px 20px rgba(239, 68, 68, 0.5)'
                          : '0 4px 20px rgba(16, 185, 129, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!translationError) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = isListening 
                          ? '0 3px 15px rgba(239, 68, 68, 0.4)'
                          : '0 3px 15px rgba(16, 185, 129, 0.4)';
                      }
                    }}
                  >
                    {isListening ? 'Stop' : 'Listen'}
                  </button>
                  
                  <button
                    onClick={() => setShowCaptions(!showCaptions)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1.25rem',
                      minWidth: '120px',
                      height: '40px',
                      background: showCaptions 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                        : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: showCaptions 
                        ? '0 3px 15px rgba(59, 130, 246, 0.4)'
                        : '0 3px 15px rgba(107, 114, 128, 0.4)',
                      backdropFilter: 'blur(10px)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = showCaptions 
                        ? '0 4px 20px rgba(59, 130, 246, 0.5)'
                        : '0 4px 20px rgba(107, 114, 128, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = showCaptions 
                        ? '0 3px 15px rgba(59, 130, 246, 0.4)'
                        : '0 3px 15px rgba(107, 114, 128, 0.4)';
                    }}
                  >
                    {showCaptions ? 'Hide CC' : 'Show CC'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Header Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {/* AI Bot Toggle Button (Only in normal mode) */}
            {!isAIOnlyMode && (
              <button
                onClick={toggleAITranscriptionBot}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  padding: '0.875rem 1.75rem',
                  minWidth: '160px',
                  height: '48px',
                  background: isAIBotActive 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isAIBotActive 
                    ? '0 4px 20px rgba(239, 68, 68, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : '0 4px 20px rgba(16, 185, 129, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)',
                  transform: 'translateY(0)',
                  ':hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isAIBotActive 
                      ? '0 6px 25px rgba(239, 68, 68, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)'
                      : '0 6px 25px rgba(16, 185, 129, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)'
                  }
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = isAIBotActive 
                    ? '0 6px 25px rgba(239, 68, 68, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)'
                    : '0 6px 25px rgba(16, 185, 129, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = isAIBotActive 
                    ? '0 4px 20px rgba(239, 68, 68, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : '0 4px 20px rgba(16, 185, 129, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <Bot size={18} />
                <span>{isAIBotActive ? 'Stop AI Bot' : 'Start AI Bot'}</span>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isAIBotActive ? '#fca5a5' : '#86efac',
                  animation: isAIBotActive ? 'pulse 2s infinite' : 'none'
                }} />
              </button>
            )}

            {/* Medical Panel Toggle Button */}
            {isDoctor && !isAIOnlyMode && (
              <button
                onClick={() => setShowDoctorPanel(!showDoctorPanel)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.625rem',
                  padding: '0.875rem 1.75rem',
                  minWidth: '160px',
                  height: '48px',
                  background: showDoctorPanel 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: showDoctorPanel 
                    ? '0 4px 20px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : '0 4px 20px rgba(99, 102, 241, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(10px)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = showDoctorPanel 
                    ? '0 6px 25px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)'
                    : '0 6px 25px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = showDoctorPanel 
                    ? '0 4px 20px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : '0 4px 20px rgba(99, 102, 241, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                {showDoctorPanel ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span>Medical Panel</span>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: showDoctorPanel ? '#93c5fd' : '#c7d2fe'
                }} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 140px)' }}>
        {/* Main Video Area */}
        <div className={`video-grid ${getGridClass()}`} style={{ 
          flex: (isDoctor && showDoctorPanel && !isAIOnlyMode) || isAIOnlyMode ? '2' : '1',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}>
          {/* Local video */}
          <div className={getVideoTileClass("local")} style={{ position: 'relative' }}>
            {!isVideoEnabled && (
              <div className="video-avatar" style={{
                background: isAIOnlyMode
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                  : isDoctor 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
              }}>
                {isAIOnlyMode ? (
                  <User size={48} color="white" />
                ) : isDoctor ? (
                  <Stethoscope size={48} color="white" />
                ) : (
                  <User size={48} color="white" />
                )}
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {isAIOnlyMode ? "You" : isDoctor ? "Dr. Attending" : "You"}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    {isAIOnlyMode ? "Patient" : isDoctor ? "Physician" : "Patient"}
                  </div>
                </div>
              </div>
            )}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={getVideoClass("local")}
              style={{ display: isVideoEnabled ? "block" : "none" }}
            />
            <div className="video-label" style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span className="video-name" style={{ fontWeight: '600' }}>
                {isAIOnlyMode ? "You" : isDoctor ? "Dr. Attending" : "You"}
              </span>
              <span className={`video-status ${isMuted ? "muted" : "active"}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                opacity: 0.8
              }}>
                {isMuted ? (
                  <>
                    <MicOff size={12} /> Muted
                  </>
                ) : (
                  <>
                    <Mic size={12} /> Active
                  </>
                )}
              </span>
            </div>
          </div>

          {/* AI Agent Video Tile (AI-only mode) */}
          {isAIOnlyMode && aiVoiceActive && (
            <div className={getVideoTileClass("ai-agent")} style={{ position: 'relative' }}>
              <div className="video-avatar" style={{
                background: isAISpeaking 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  animation: isAISpeaking ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }}>
                  🤖
                </div>
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    Dr. Nirogya
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    {isAISpeaking ? '🗣️ Speaking...' : '👂 Listening...'}
                  </div>
                </div>
              </div>
              <div className="video-label" style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Bot size={16} />
                <span className="video-name" style={{ fontWeight: '600' }}>
                  Dr. Nirogya (AI)
                </span>
                <span className="video-status active" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#10b981'
                }}>
                  {isAISpeaking ? (
                    <>
                      <Mic size={12} /> Speaking
                    </>
                  ) : (
                    <>
                      <Mic size={12} /> Active
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Remote videos */}
          {remoteUsers.map((userId) => (
            <div key={userId} className={getVideoTileClass(userId)} style={{ position: 'relative' }}>
              {remoteVideoStatus[userId] === false && (
                <div className="video-avatar" style={{
                  background: patientInfo 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem'
                }}>
                  {patientInfo ? (
                    <div style={{
                      width: '4rem',
                      height: '4rem',
                      background: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#059669'
                    }}>
                      {patientInfo.name.charAt(0)}
                    </div>
                  ) : (
                    <VideoOff size={isMobile ? 24 : 32} color="white" />
                  )}
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                      {patientInfo ? patientInfo.name : `User ${userId.substring(0, 6)}`}
                    </div>
                    {patientInfo && (
                      <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                        Age {patientInfo.age} • {patientInfo.id.substring(0, 8)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <video
                ref={(el) => {
                  remoteVideoRefs.current[userId] = el;
                  // Mute if translation is enabled
                  if (el) el.muted = shouldMuteRemoteAudio;
                }}
                autoPlay
                playsInline
                muted={shouldMuteRemoteAudio}
                className={getVideoClass(userId)}
                style={{
                  display: remoteVideoStatus[userId] !== false ? "block" : "none",
                }}
              />
              <div className="video-label" style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span className="video-name" style={{ fontWeight: '600' }}>
                  {patientInfo ? patientInfo.name : `User ${userId.substring(0, 6)}`}
                </span>
                {activeSpeaker === userId && (
                  <span className="video-status speaking" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    color: '#10b981'
                  }}>
                    <Mic size={12} /> Speaking
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Captions Overlay */}
          {myPreferredLanguage !== 'off' && showCaptions && translationHistory.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '80%',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{
                  color: 'white',
                  fontSize: '1.125rem',
                  lineHeight: '1.6',
                  textAlign: 'center',
                  fontWeight: '500',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  {translationHistory[translationHistory.length - 1]?.translatedText || 'Listening...'}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isListening ? '#10b981' : '#6b7280',
                    animation: isListening ? 'pulse 2s infinite' : 'none'
                  }} />
                  <span>
                    {isListening ? 
                      `Translating to ${myPreferredLanguage.toUpperCase()}` : 
                      'Translation paused'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - Doctor Panel or AI Panel */}
        {((isDoctor && showDoctorPanel && !isAIOnlyMode) || isAIOnlyMode) && (
          <div style={{
            flex: '1',
            minWidth: '400px',
            background: 'white',
            borderLeft: isAIOnlyMode ? '4px solid #8b5cf6' : '4px solid #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Panel tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #e5e7eb',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
            }}>
              {isAIOnlyMode ? (
                <>
                  <button
                    onClick={() => setActiveTab("chat")}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem 0.75rem',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      border: 'none',
                      background: activeTab === "chat" ? 'white' : 'transparent',
                      color: activeTab === "chat" ? '#8b5cf6' : '#6b7280',
                      borderBottom: activeTab === "chat" ? '4px solid #8b5cf6' : 'none'
                    }}
                  >
                    <MessageSquare size={20} />
                    <span>💬 AI Chat</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("transcript")}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem 0.75rem',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      border: 'none',
                      background: activeTab === "transcript" ? 'white' : 'transparent',
                      color: activeTab === "transcript" ? '#8b5cf6' : '#6b7280',
                      borderBottom: activeTab === "transcript" ? '4px solid #8b5cf6' : 'none'
                    }}
                  >
                    <FileAudio size={20} />
                    <span>📝 Transcript</span>
                  </button>
                </>
              ) : (
                [
                  { id: "patient", icon: User, label: "📋 Medical Records", color: "blue" },
                  { id: "prescription", icon: FileText, label: "💊 Prescription", color: "green" },
                  { id: "transcript", icon: FileAudio, label: "🎙️ AI Transcript", color: "purple" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '1rem 0.75rem',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      border: 'none',
                      background: activeTab === tab.id ? 'white' : 'transparent',
                      color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                      borderBottom: activeTab === tab.id ? '4px solid #3b82f6' : 'none'
                    }}
                  >
                    <tab.icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                ))
              )}
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* AI Chat Tab (AI-only mode) */}
              {isAIOnlyMode && activeTab === "chat" && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {!aiVoiceActive ? (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3rem',
                      textAlign: 'center',
                      color: '#6b7280'
                    }}>
                      <Bot size={80} color="#8b5cf6" style={{ marginBottom: '2rem' }} />
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151', marginBottom: '1rem' }}>
                        Welcome to AI Voice Consultation
                      </h3>
                      <p style={{ fontSize: '1rem', marginBottom: '2rem', maxWidth: '400px' }}>
                        Click the button below to start a real-time voice conversation with Dr. Nirogya, 
                        your AI health assistant. Speak naturally and get instant responses!
                      </p>
                      <button
                        onClick={startAIVoiceConversation}
                        style={{
                          padding: '1.25rem 2.5rem',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '1rem',
                          fontWeight: '700',
                          fontSize: '1.125rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Mic size={24} />
                        Start AI Conversation
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '1.5rem',
                        background: '#f8fafc'
                      }}>
                        {chatMessages.map((message) => (
                          <div key={message.id} style={{ 
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: message.isAI ? '#ede9fe' : message.sender === 'System' ? '#dbeafe' : 'white',
                            borderRadius: '0.75rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ 
                              fontWeight: 'bold', 
                              color: message.isAI ? '#6d28d9' : message.sender === 'System' ? '#1e40af' : '#374151',
                              marginBottom: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              {message.isAI && <Bot size={16} />}
                              {message.sender}
                            </div>
                            <div style={{ color: '#374151', marginBottom: '0.5rem' }}>
                              {message.text}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {message.timestamp}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ 
                        padding: '1rem',
                        background: 'white',
                        borderTop: '1px solid #e2e8f0'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          background: aiStatus === "listening" ? '#dcfce7' : 
                                     aiStatus === "thinking" ? '#fef3c7' : 
                                     aiStatus === "connecting" ? '#dbeafe' :
                                     aiStatus === "error" ? '#fee2e2' : '#f3f4f6',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          <Bot size={16} />
                          <span>
                            {aiStatus === "listening" ? "🎤 Listening..." :
                             aiStatus === "thinking" ? "🤔 Thinking..." :
                             aiStatus === "connecting" ? "🔄 Connecting..." :
                             aiStatus === "error" ? "❌ Error" :
                             aiStatus === "ready" ? "✅ Ready" :
                             "⏸️ Inactive"}
                          </span>
                        </div>
                        <button
                          onClick={stopAIVoiceConversation}
                          style={{ 
                            width: '100%',
                            padding: '1rem 1.5rem', 
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '0.75rem',
                            fontWeight: '700',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Phone size={20} />
                          End AI Conversation
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* AI Transcript Tab (Both modes) */}
              {activeTab === "transcript" && (
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ 
                      color: '#374151', 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FileAudio size={24} />
                      {isAIOnlyMode ? "Conversation Transcript" : "AI Live Transcript"}
                    </h3>
                    {!isAIOnlyMode && (
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: isAIBotActive ? '#dcfce7' : '#fee2e2',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: isAIBotActive ? '#16a34a' : '#dc2626'
                      }}>
                        {isAIBotActive ? '🟢 Recording' : '🔴 Stopped'}
                      </div>
                    )}
                    {isAIOnlyMode && (
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: aiVoiceActive ? '#dcfce7' : '#fee2e2',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: aiVoiceActive ? '#16a34a' : '#dc2626'
                      }}>
                        {aiVoiceActive ? '🟢 Active' : '🔴 Inactive'}
                      </div>
                    )}
                  </div>

                  {aiTranscript.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem',
                      color: '#6b7280'
                    }}>
                      <FileAudio size={64} color="#d1d5db" />
                      <h4 style={{ marginTop: '1rem', color: '#374151' }}>
                        {isAIOnlyMode ? "No Conversation Yet" : "No Transcript Yet"}
                      </h4>
                      <p>
                        {isAIOnlyMode 
                          ? "Start the AI conversation to see the transcript here"
                          : isAIBotActive 
                            ? "Listening... Speak to generate transcript"
                            : "Click 'Start AI Bot' to begin transcription"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {aiTranscript.map((entry, index) => (
                        <div key={entry.id} style={{
                          background: entry.speaker === "System" ? '#dbeafe' : 
                                     entry.speaker === "Doctor" || entry.speaker === "Dr. Nirogya" ? '#f0fdf4' : 
                                     '#fef3c7',
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          marginBottom: '1rem',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ 
                              fontWeight: 'bold', 
                              color: entry.speaker === "System" ? '#1e40af' :
                                     entry.speaker === "Doctor" || entry.speaker === "Dr. Nirogya" ? '#15803d' :
                                     '#92400e',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              {(entry.speaker === "Doctor" || entry.speaker === "Dr. Nirogya") && <Stethoscope size={16} />}
                              {entry.speaker === "Patient" || entry.speaker === "You" ? <User size={16} /> : null}
                              {entry.speaker === "System" && <Bot size={16} />}
                              {entry.speaker}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {entry.timestamp}
                            </div>
                          </div>
                          <div style={{ color: '#374151', lineHeight: '1.5' }}>
                            {entry.text}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Enhanced Patient Information Panel */}
              {!isAIOnlyMode && activeTab === "patient" && (
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2rem'
                  }}>
                    <h3 style={{ 
                      color: '#1f2937', 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <User size={28} color="#3b82f6" />
                      Patient Medical Records
                    </h3>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '0.75rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}>
                      ✅ Records Loaded
                    </div>
                  </div>

                  {/* Patient Basic Info Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      marginBottom: '1.5rem'
                    }}>

                      <div>
                        <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                          {patientInfo?.name || 'Swasti Mohanty'}
                        </h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          <span>📅 Age: {patientInfo?.age || '20'}</span>
                          <span>👤 Gender: {patientInfo?.gender || 'Male'}</span>
                          <span>🆔 MRN: {patientInfo?.mrn?.substring(0, 8) || 'MRN12345'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.75rem', border: '1px solid #bae6fd' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Phone size={16} color="#0ea5e9" />
                          <span style={{ fontWeight: '600', color: '#0c4a6e' }}>Phone</span>
                        </div>
                        <p style={{ color: '#374151', margin: 0 }}>{patientInfo?.phoneNumber || '8219489596'}</p>
                      </div>
                      
                      <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Calendar size={16} color="#22c55e" />
                          <span style={{ fontWeight: '600', color: '#15803d' }}>Date of Birth</span>
                        </div>
                        <p style={{ color: '#374151', margin: 0 }}>{patientInfo?.dob || 'July 30, 2005'}</p>
                      </div>
                      
                      <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.75rem', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <MapPin size={16} color="#f59e0b" />
                          <span style={{ fontWeight: '600', color: '#92400e' }}>Address</span>
                        </div>
                        <p style={{ color: '#374151', margin: 0 }}>Chitkara University Baddi , H.P</p>
                      </div>
                    </div>
                  </div>

                  {/* Current Vitals Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h5 style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <Activity size={24} color="#ef4444" />
                      Current Vitals
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        borderRadius: '0.75rem',
                        textAlign: 'center',
                        border: '1px solid #fca5a5'
                      }}>
                        <Heart size={24} color="#dc2626" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#991b1b' }}>120/80</div>
                        <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>Blood Pressure</div>
                      </div>
                      
                      <div style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                        borderRadius: '0.75rem',
                        textAlign: 'center',
                        border: '1px solid #93c5fd'
                      }}>
                        <Activity size={24} color="#2563eb" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1d4ed8' }}>72 BPM</div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>Heart Rate</div>
                      </div>
                      
                      <div style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '0.75rem',
                        textAlign: 'center',
                        border: '1px solid #fcd34d'
                      }}>
                        <Thermometer size={24} color="#d97706" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>98.6°F</div>
                        <div style={{ fontSize: '0.875rem', color: '#78350f' }}>Temperature</div>
                      </div>
                      
                      <div style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                        borderRadius: '0.75rem',
                        textAlign: 'center',
                        border: '1px solid #86efac'
                      }}>
                        <Activity size={24} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d' }}>98%</div>
                        <div style={{ fontSize: '0.875rem', color: '#14532d' }}>Oxygen Sat</div>
                      </div>
                    </div>
                  </div>

                  {/* Medical History Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h5 style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <FileText size={24} color="#8b5cf6" />
                      Medical History
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>🩺 Chief Complaint</div>
                        <p style={{ color: '#6b7280', margin: 0 }}>Chest pain and shortness of breath for 2 days</p>
                      </div>
                      
                      <div style={{
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>🏥 Past Medical History</div>
                        <ul style={{ color: '#6b7280', margin: 0, paddingLeft: '1.5rem' }}>
                          <li>Hypertension (2018)</li>
                          <li>Type 2 Diabetes (2020)</li>
                          <li>Hyperlipidemia (2019)</li>
                        </ul>
                      </div>
                      
                      <div style={{
                        padding: '1rem',
                        background: '#fef2f2',
                        borderRadius: '0.75rem',
                        border: '1px solid #fecaca'
                      }}>
                        <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>⚠️ Allergies</div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: '#fee2e2',
                            borderRadius: '1rem',
                            fontSize: '0.875rem',
                            color: '#991b1b',
                            border: '1px solid #fca5a5'
                          }}>Penicillin</span>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: '#fee2e2',
                            borderRadius: '1rem',
                            fontSize: '0.875rem',
                            color: '#991b1b',
                            border: '1px solid #fca5a5'
                          }}>Shellfish</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Medications Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h5 style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <Pill size={24} color="#10b981" />
                      Current Medications
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {[
                        { name: 'Lisinopril', dose: '10mg', frequency: 'Once daily', indication: 'Hypertension' },
                        { name: 'Metformin', dose: '500mg', frequency: 'Twice daily', indication: 'Diabetes' },
                        { name: 'Atorvastatin', dose: '20mg', frequency: 'Once daily', indication: 'Hyperlipidemia' }
                      ].map((med, index) => (
                        <div key={index} style={{
                          padding: '1rem',
                          background: '#f0fdf4',
                          borderRadius: '0.75rem',
                          border: '1px solid #bbf7d0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#15803d', fontSize: '1rem' }}>{med.name}</div>
                            <div style={{ color: '#16a34a', fontSize: '0.875rem' }}>{med.dose} - {med.frequency}</div>
                            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>For: {med.indication}</div>
                          </div>
                          <div style={{
                            padding: '0.5rem',
                            background: '#22c55e',
                            borderRadius: '0.5rem',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            Active
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Prescription Panel */}
              {!isAIOnlyMode && activeTab === "prescription" && (
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2rem'
                  }}>
                    <h3 style={{ 
                      color: '#1f2937', 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <Pill size={28} color="#10b981" />
                      Digital Prescription
                    </h3>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: '0.75rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}>
                      📝 Draft Mode
                    </div>
                  </div>

                  {/* Prescription Header Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                          Dr. Aryan Sharma
                        </h4>
                        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          Internal Medicine Specialist<br/>
                          License: MD123456<br/>
                          Nirogya Medical Center<br/>
                          123 Healthcare Blvd, Medical City, MC 12345<br/>
                          Phone: (555) 123-4567
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Date: {new Date().toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Rx #: RX{Date.now().toString().slice(-6)}</div>
                      </div>
                    </div>
                    
                    <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '0.75rem', border: '1px solid #bae6fd' }}>
                      <div style={{ fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem' }}>👤 Patient Information</div>
                      <div style={{ color: '#374151', fontSize: '0.875rem' }}>
                        <strong>Name:</strong> {patientInfo?.name || 'Swasti Mohanty'}<br/>
                        <strong>Age:</strong> {patientInfo?.age || '20'} years<br/>
                        <strong>MRN:</strong> {patientInfo?.mrn?.substring(0, 8) || 'MRN12345'}<br/>
                        <strong>Date of Birth:</strong> {patientInfo?.dob || 'July 30, 2005'}
                      </div>
                    </div>
                  </div>

                  {/* Prescription Medications Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h5 style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      💊 Prescribed Medications
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {[
                        {
                          name: 'Amoxicillin',
                          strength: '500mg',
                          form: 'Capsules',
                          quantity: '21 capsules',
                          directions: 'Take 1 capsule by mouth three times daily with food for 7 days',
                          refills: '0 refills',
                          indication: 'Bacterial infection'
                        },
                        {
                          name: 'Ibuprofen',
                          strength: '400mg',
                          form: 'Tablets',
                          quantity: '30 tablets',
                          directions: 'Take 1 tablet by mouth every 6-8 hours as needed for pain',
                          refills: '2 refills',
                          indication: 'Pain and inflammation'
                        },
                        {
                          name: 'Omeprazole',
                          strength: '20mg',
                          form: 'Capsules',
                          quantity: '30 capsules',
                          directions: 'Take 1 capsule by mouth once daily before breakfast',
                          refills: '5 refills',
                          indication: 'Acid reflux'
                        }
                      ].map((med, index) => (
                        <div key={index} style={{
                          padding: '1.5rem',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          borderRadius: '1rem',
                          border: '2px solid #bbf7d0',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: '#22c55e',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            #{index + 1}
                          </div>
                          
                          <div style={{ marginBottom: '1rem' }}>
                            <h6 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#15803d', marginBottom: '0.25rem' }}>
                              {med.name} {med.strength}
                            </h6>
                            <div style={{ fontSize: '0.875rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                              {med.form} • Quantity: {med.quantity} • {med.refills}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
                              For: {med.indication}
                            </div>
                          </div>
                          
                          <div style={{
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '0.75rem',
                            border: '1px solid #d1fae5'
                          }}>
                            <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                              📝 Directions for Use:
                            </div>
                            <div style={{ color: '#1f2937', fontSize: '0.875rem', lineHeight: '1.4' }}>
                              {med.directions}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Notes Card */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h5 style={{
                      fontSize: '1.25rem',
                      fontWeight: 'bold',
                      color: '#1f2937',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <FileText size={24} color="#8b5cf6" />
                      Clinical Notes & Instructions
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{
                        padding: '1rem',
                        background: '#fef3c7',
                        borderRadius: '0.75rem',
                        border: '1px solid #fde68a'
                      }}>
                        <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>⚠️ Important Instructions:</div>
                        <ul style={{ color: '#78350f', margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                          <li>Complete the full course of antibiotics even if feeling better</li>
                          <li>Take ibuprofen with food to prevent stomach upset</li>
                          <li>Return if symptoms worsen or new symptoms develop</li>
                          <li>Follow up in 1 week if not improving</li>
                        </ul>
                      </div>
                      
                      <div style={{
                        padding: '1rem',
                        background: '#dbeafe',
                        borderRadius: '0.75rem',
                        border: '1px solid #93c5fd'
                      }}>
                        <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem' }}>📅 Follow-up Care:</div>
                        <div style={{ color: '#1e3a8a', fontSize: '0.875rem' }}>
                          Schedule follow-up appointment in 2 weeks to reassess condition and review treatment response.
                          Contact office immediately if experiencing severe side effects or worsening symptoms.
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '1rem',
                        background: '#f0fdf4',
                        borderRadius: '0.75rem',
                        border: '1px solid #bbf7d0'
                      }}>
                        <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '0.5rem' }}>📞 Emergency Contact:</div>
                        <div style={{ color: '#14532d', fontSize: '0.875rem' }}>
                          For urgent medical concerns: Call (555) 123-4567<br/>
                          For after-hours emergencies: Visit nearest emergency room or call 911
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prescription Actions */}
                  <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          alert('✅ Prescription saved successfully!\n\nPatient: ' + (patientInfo?.name || 'Swasti Mohanty') + '\nDate: ' + new Date().toLocaleDateString() + '\nMedications: 3 items prescribed\n\nPrescription has been sent to pharmacy.');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem 2rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.75rem',
                          fontWeight: '700',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Send size={20} />
                        Send to Pharmacy
                      </button>
                      
                      <button
                        onClick={() => {
                          const prescriptionData = {
                            doctor: 'Dr. Aryan Sharma',
                            patient: patientInfo?.name || 'Swasti Mohanty',
                            date: new Date().toLocaleDateString(),
                            medications: 3
                          };
                          console.log('Prescription saved:', prescriptionData);
                          alert('💾 Prescription saved to patient records!');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem 2rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.75rem',
                          fontWeight: '700',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <FileText size={20} />
                        Save to Records
                      </button>
                      
                      <button
                        onClick={() => {
                          if (window.print) {
                            window.print();
                          } else {
                            alert('🖨️ Print functionality will be available in production version.');
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem 2rem',
                          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                          color: '#374151',
                          border: '2px solid #d1d5db',
                          borderRadius: '0.75rem',
                          fontWeight: '700',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        🖨️ Print Copy
                      </button>
                    </div>
                    
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        🔒 This prescription is digitally signed and encrypted for security.<br/>
                        Electronic signature: Dr. Aryan Sharma - {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Enhanced Controls */}
      <div className="controls-container" style={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        padding: '1.5rem 2rem',
        borderTop: '4px solid #e2e8f0',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
          <button
            onClick={toggleAudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              borderRadius: '1rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: isMuted 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              color: isMuted ? 'white' : '#374151',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            {isMuted ? " Unmute" : " Mute"}
          </button>
          
          <button
            onClick={toggleVideo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              borderRadius: '1rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: !isVideoEnabled 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              color: !isVideoEnabled ? 'white' : '#374151',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            {isVideoEnabled ? " Stop Video" : " Start Video"}
          </button>
          
          <button
            onClick={handleHangUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              borderRadius: '1rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            <Phone size={20} />
             End {isAIOnlyMode ? "Session" : "Consultation"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
