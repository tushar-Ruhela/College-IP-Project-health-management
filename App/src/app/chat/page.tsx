'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Search, Loader2, Image as ImageIcon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiCall } from '@/lib/api';
import { getStorageItem, STORAGE_KEYS } from '@/lib/storage';

// Client-only timestamp component to avoid hydration mismatch
function Timestamp({ date }: { date: Date }) {
  const [mounted, setMounted] = useState(false);
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    setMounted(true);
    setTimeString(date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }));
  }, [date]);

  if (!mounted) {
    // Return a placeholder during SSR that matches the expected format
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return <span>{`${displayHours}:${displayMinutes} ${ampm}`}</span>;
  }

  return <span>{timeString}</span>;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string;
  toolCalls?: Array<{ tool: string; result?: any }>;
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: 'Hello! I\'m **Health Management System AI**, your health assistant. How can I help you with your health today?',
    sender: 'ai',
    timestamp: new Date(),
  },
];

interface UserInfo {
  name?: string;
  age?: number;
  phoneNumber?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [toolExecuting, setToolExecuting] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  
  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode to get city name (or use coordinates)
          // For now, we'll use coordinates and let the backend handle it
          setUserLocation(`${latitude},${longitude}`);
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
          // Don't set location if user denies
        }
      );
    }
  }, []);
  
  // Get user info from storage (including phone number)
  const userInfo = getStorageItem<UserInfo>(STORAGE_KEYS.USER_INFO) || {};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const messageText = inputValue.trim() || (selectedImage ? 'Please analyze this image.' : '');
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      imageUrl: selectedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setImagePreview(null);
    setIsLoading(true);
    setError(null);
    setToolExecuting(null);

    try {
      // Build conversation history (exclude the initial greeting)
      const conversationHistory = messages
        .filter(msg => msg.id !== '1') // Exclude initial greeting
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      const response = await apiCall('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
          phoneNumber: userInfo.phoneNumber || null,
          imageUrl: imageToSend || null,
          location: userLocation || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      // Check for tool calls and show indicators
      if (data.toolCalls && data.toolCalls.length > 0) {
        const toolNames = data.toolCalls.map((tc: any) => tc.tool).join(', ');
        setToolExecuting(toolNames);
        
        // Clear after a delay
        setTimeout(() => setToolExecuting(null), 2000);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message || 'I apologize, but I couldn\'t generate a response. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        toolCalls: data.toolCalls || undefined,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      setError(errorMessage);
      
      // Show error message in chat
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `⚠️ **Error:** ${errorMessage}`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg =>
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="min-h-screen bg-white flex flex-col"
      style={{ 
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-2 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2F3C31] rounded-3xl p-4 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/3 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-extrabold text-white mb-1"
            >
              Health Chat
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/70 text-xs mb-3"
            >
              Chat with Health Management System AI for health guidance
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1f2a22] border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 sm:space-y-4" 
        style={{ 
          // Small extra space so the last message isn't tight against the input
          paddingBottom: '1.5rem',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0
        }}
      >
        <AnimatePresence>
          {(searchQuery ? filteredMessages : messages).map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`flex items-start gap-2.5 sm:gap-3 max-w-[90%] sm:max-w-[80%] md:max-w-[75%] ${
                  message.sender === 'user' ? 'flex-row-reverse ml-auto' : 'flex-row'
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-[#83C818] text-white'
                    : 'bg-gradient-to-br from-[#83C818] to-[#6BA014] text-white'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  ) : (
                    <Bot className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  )}
                </div>
                <Card className={`p-3.5 sm:p-4 rounded-2xl shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-[#83C818] text-white border-[#83C818]'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  {/* Show image if present */}
                  {message.imageUrl && (
                    <div className="mb-2.5 rounded-lg overflow-hidden">
                      <img 
                        src={message.imageUrl} 
                        alt="Uploaded" 
                        className="max-w-full h-auto max-h-48 sm:max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  )}
                  {message.text && (
                  <div className={`text-sm sm:text-base leading-relaxed break-words ${
                    message.sender === 'user' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {message.sender === 'ai' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800 prose-code:text-gray-800 prose-pre:bg-gray-100 prose-pre:text-gray-800"
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="ml-2">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-gray-200/50 px-1.5 py-0.5 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs mb-2">
                              {children}
                            </pre>
                          ),
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    )}
                  </div>
                  )}
                  <p className={`text-[10px] sm:text-xs mt-2.5 ${
                    message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                  }`}>
                    <Timestamp date={message.timestamp} />
                  </p>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-start gap-2.5 sm:gap-3 max-w-[90%] sm:max-w-[80%]">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#83C818] to-[#6BA014] text-white shadow-sm">
                <Bot className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              </div>
              <Card className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 border-gray-200 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#83C818]" />
                  <span className="text-sm sm:text-base text-gray-600">
                    {toolExecuting ? `Using ${toolExecuting}...` : 'AI is thinking...'}
                  </span>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div 
        className="px-4 py-3 sm:py-4 border-t border-gray-200 bg-white"
        style={{ 
          paddingBottom: `calc(5rem + max(0.75rem, env(safe-area-inset-bottom, 0px)))`,
          paddingTop: '0.75rem'
        }}
      >
        {error && (
          <div className="mb-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs sm:text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-2.5 relative inline-block">
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-w-[180px] sm:max-w-[200px] max-h-[180px] sm:max-h-[200px] rounded-lg object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 active:scale-95 transition-transform touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end gap-2.5 sm:gap-3"
        >
          {/* Image Upload Button */}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload"
            disabled={isLoading}
          />
          <label htmlFor="image-upload" className="touch-manipulation">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-gray-200 hover:border-[#83C818] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center"
                style={{ minWidth: '48px', minHeight: '48px' }}
                aria-label="Upload image"
              >
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </Button>
            </motion.div>
          </label>

          <Input
            type="text"
            placeholder={selectedImage ? "Add a message (optional)..." : "Type your message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="flex-1 rounded-xl border-2 border-gray-200 focus:border-[#83C818] focus:ring-2 focus:ring-[#83C818]/20 text-sm sm:text-base py-3 sm:py-3.5 min-h-[48px] touch-manipulation"
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="touch-manipulation">
            <Button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#83C818] hover:bg-[#6BA014] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center"
              style={{ minWidth: '48px', minHeight: '48px' }}
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
