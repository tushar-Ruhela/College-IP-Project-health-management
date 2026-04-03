'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Camera, Phone, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiCall } from '@/lib/api';

export default function AIDiagnosisPage() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');
  const [status, setStatus] = useState('Connecting...');
  const [isLoading, setIsLoading] = useState(true);
  // Type for UltravoxSession - includes methods we use
  // Note: UltravoxSession type is not exported, so we define our own interface
  interface UltravoxSessionInterface {
    leaveCall: () => Promise<void>;
    toggleMic?: () => void;
    muteMic?: () => void;
    unmuteMic?: () => void;
    addEventListener: (event: string, handler: (e: Event) => void) => void;
    joinCall: (url: string) => void | Promise<void>;
  }

  const [session, setSession] = useState<UltravoxSessionInterface | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize webcam and call only on client
  useEffect(() => {
    // Only run on client side
    if (!isClient || typeof window === 'undefined') return;

    initializeWebcam();
    initializeCall();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isClient]);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (session) {
        session.leaveCall().catch(console.error);
      }
    };
  }, [session]);

  // Update call duration timer
  useEffect(() => {
    if (!callStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setCallDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  const initializeWebcam = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Webcam not available');
        setStatus('Webcam not available');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      }
    } catch (error: unknown) {
      console.error('Error accessing webcam:', error);
      let message = 'Camera unavailable';
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          message = 'Camera permission denied';
        } else if (error.name === 'NotFoundError') {
          message = 'No camera found';
        }
      }
      setStatus(message);
      setError(message);
    }
  };

  const initializeCall = async () => {
    try {
      const { UltravoxSession } = await import('ultravox-client');
      
      const response = await apiCall('/api/create-ai-call', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }

      const text = await response.text();
      let callDetails;
      
      try {
        callDetails = JSON.parse(text);
      } catch {
        console.error('Failed to parse response:', text);
        throw new Error('Invalid response from server');
      }
      
      if (!callDetails.success) {
        const errorMsg = callDetails.error || 'Failed to create call';
        console.error('Call creation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      const uvSession = new UltravoxSession({ 
        experimentalMessages: new Set(["debug"]),
        audioContext: new AudioContext(),
      });

      uvSession.addEventListener('status', (e: Event) => {
        const target = e.target as { _status?: string };
        const newStatus = target._status;
        if (newStatus) {
          setStatus(newStatus);
          
          if (newStatus === 'idle') {
            setIsLoading(false);
            setCallStartTime(Date.now());
          }
        }
      });

      uvSession.addEventListener('transcripts', (e: Event) => {
        const target = e.target as { _transcripts?: unknown };
        const transcripts = target._transcripts;
        // You can display transcripts if needed
        console.log('Transcripts:', transcripts);
      });

      await uvSession.joinCall(callDetails.data.joinUrl);
      setSession(uvSession);
      setIsLoading(false);

    } catch (error: unknown) {
      console.error('Error initializing call:', error);
      setStatus('Connection failed');
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to AI assistant. Please check your connection and try again.';
      setError(errorMessage);
    }
  };

  const handleEndCall = async () => {
    try {
      if (session) {
        await session.leaveCall();
        setSession(null);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Redirect to home
      window.location.href = '/home';
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleMic = () => {
    if (session) {
      // Try toggleMic first, fallback to muteMic/unmuteMic pattern
      if (session.toggleMic) {
        session.toggleMic();
      } else if (session.muteMic && session.unmuteMic) {
        if (isMuted) {
          session.unmuteMic();
        } else {
          session.muteMic();
        }
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) {
      console.warn('Video stream not available');
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    // Flip horizontally to match video display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    console.log('Photo captured:', dataUrl.substring(0, 50) + '...');
    // You could save this or display it in a modal
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] pb-20 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] pb-20 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1a1a1a]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 p-4">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-white">AI Diagnosis</h1>
            <p className="text-sm text-white/70">Voice consultation</p>
          </div>
        </div>
      </div>

      {/* Main video area - User's video as primary view */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* User's video - Main view (full screen) */}
        {isVideoOff ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-[#83C818]/20 flex items-center justify-center mb-4 mx-auto">
                <span className="text-6xl">👤</span>
              </div>
              <p className="text-white/70 text-sm">Camera is off</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Error overlay */}
        {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50"
              >
            <div className="text-center max-w-md px-6">
                <div className="w-48 h-48 rounded-full bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                  <div className="text-6xl">⚠️</div>
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Connection Error</h3>
                <p className="text-white/70 text-sm mb-4">{error}</p>
                <Button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    setStatus('Connecting...');
                    initializeCall();
                  }}
                  className="bg-[#83C818] hover:bg-[#6BA014] text-white"
                >
                  Try Again
                </Button>
                <Link href="/home">
                  <Button variant="outline" className="mt-2 text-white border-white/20">
                    Go Back
                  </Button>
                </Link>
            </div>
              </motion.div>
        )}

        {/* Loading overlay */}
        {isLoading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-40"
              >
            <div className="text-center">
              <div className="w-48 h-48 rounded-full bg-[#83C818]/20 flex items-center justify-center mb-4 mx-auto">
                  <div className="w-16 h-16 border-4 border-[#83C818] border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white/70 text-sm">{status}</p>
            </div>
              </motion.div>
        )}

        {/* AI Agent Avatar - Picture in Picture (top-right) */}
        {!isLoading && !error && (
              <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
            className="absolute top-4 right-4 w-32 h-40 rounded-2xl overflow-hidden border-2 border-[#83C818]/50 shadow-2xl bg-gradient-to-br from-[#83C818]/30 to-[#6BA014]/30 backdrop-blur-md z-30"
              >
            <div className="w-full h-full flex flex-col items-center justify-center p-3">
              {/* AI Avatar Circle */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#83C818] to-[#6BA014] flex items-center justify-center shadow-lg border-2 border-white/30 mb-2">
                <div className="text-3xl">🤖</div>
                </div>
                
                {/* Pulsing ring effect */}
                <motion.div
                  animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                className="absolute inset-0 rounded-2xl border-2 border-[#83C818]/50"
                />
                
                {/* AI Name Badge */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                <p className="text-white font-semibold text-xs">Health Management System AI</p>
                <p className="text-white/70 text-[10px]">AI Guardian</p>
          </div>

              {/* Speaking indicator */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
              />
            </div>
          </motion.div>
          )}

        {/* Call timer - top left */}
        {callStartTime && !error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 z-30"
          >
            <p className="text-white text-sm font-mono font-semibold">{callDuration}</p>
          </motion.div>
        )}

        {/* Status indicator - bottom left */}
        {!isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="absolute bottom-24 left-4 bg-black/70 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20 z-30"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} />
              <p className="text-white text-xs font-medium">
                {isMuted ? 'Muted' : 'Speaking'} • {status}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls bar */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          delay: 0.5,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
        className="sticky bottom-16 bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/10 p-4"
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute button */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isMuted
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            } backdrop-blur-sm transition-all duration-200`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </motion.button>

          {/* Video toggle */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isVideoOff
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                : 'bg-white/10 text-white hover:bg-white/20'
            } backdrop-blur-sm transition-all duration-200`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </motion.button>

          {/* Camera button */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200"
            onClick={capturePhoto}
          >
            <Camera className="w-6 h-6" />
          </motion.button>

          {/* End call button */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center shadow-lg hover:shadow-xl hover:shadow-red-500/50 transition-all duration-200"
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </motion.button>

          {/* More options */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-200"
          >
            <MoreVertical className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Status text */}
        <motion.p
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center text-white/70 text-xs mt-3"
        >
          {isMuted ? 'Microphone muted' : 'Microphone active'} • {status}
        </motion.p>
      </motion.div>

      <BottomNav />
    </div>
  );
}
