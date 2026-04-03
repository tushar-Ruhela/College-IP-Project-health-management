import React, { useState, useEffect } from 'react';
import { 
  Languages, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Trash2,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  Play,
  RefreshCw
} from 'lucide-react';
import { useSimpleTranslation } from '../hooks/useSimpleTranslation';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

export default function SimpleTranslationPanel({ 
  myLanguage, 
  targetLanguage, 
  enabled = false,
  onLanguageChange 
}) {
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    isRecording,
    isTranslating,
    translationHistory,
    error,
    isServiceAvailable,
    toggleRecording,
    clearHistory,
    replayAudio,
    checkServiceHealth
  } = useSimpleTranslation(myLanguage, targetLanguage, enabled);

  // Check service health on mount
  useEffect(() => {
    if (enabled) {
      checkServiceHealth();
    }
  }, [enabled, checkServiceHealth]);

  const getLanguageName = (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.flag} ${lang.name}` : code;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!enabled) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Languages size={24} />
            <div>
              <h3 className="font-bold text-lg">Real-time Translation</h3>
              <p className="text-sm opacity-90">
                {getLanguageName(myLanguage)} → {getLanguageName(targetLanguage)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Service Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isServiceAvailable 
                ? 'bg-green-500/20 text-green-100' 
                : 'bg-red-500/20 text-red-100'
            }`}>
              {isServiceAvailable ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isServiceAvailable ? 'Ready' : 'Service Down'}
            </div>
            
            {/* Refresh Service Status */}
            <button
              onClick={checkServiceHealth}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Check service status"
            >
              <RefreshCw size={16} />
            </button>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Language
              </label>
              <select
                value={myLanguage}
                onChange={(e) => onLanguageChange?.(e.target.value, targetLanguage)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Language
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => onLanguageChange?.(myLanguage, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Service URL: http://localhost:5000
            </div>
            
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              <Trash2 size={16} />
              Clear History
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-red-700 text-sm">❌ {error}</p>
          {!isServiceAvailable && (
            <p className="text-red-600 text-xs mt-1">
              Start the translation service: <code>python translation-service/simple_translation_server.py</code>
            </p>
          )}
        </div>
      )}

      {/* Recording Controls */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-center">
          <button
            onClick={toggleRecording}
            disabled={!isServiceAvailable || isTranslating}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : isServiceAvailable && !isTranslating
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            {isTranslating ? 'Translating...' : isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
        
        {(isRecording || isTranslating) && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600">
              {isRecording ? '🎤 Recording your speech...' : '🔄 Processing translation...'}
            </p>
          </div>
        )}
      </div>

      {/* Translation History */}
      <div className="max-h-80 overflow-y-auto">
        {translationHistory.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
            <p>No translations yet</p>
            <p className="text-sm mt-1">Start recording to see live translations</p>
            {!isServiceAvailable && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium">⚠️ Translation service not running</p>
                <p className="text-yellow-700 text-xs mt-1">
                  Run: <code>python translation-service/simple_translation_server.py</code>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {translationHistory.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    {formatTime(item.timestamp)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">
                      {getLanguageName(item.sourceLanguage)} → {getLanguageName(item.targetLanguage)}
                    </div>
                    {item.audioBlob && (
                      <button
                        onClick={() => replayAudio(item)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Replay audio"
                      >
                        <Play size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-blue-100 p-2 rounded text-sm">
                    <span className="font-medium text-blue-800">Original:</span>
                    <p className="text-blue-700 mt-1">{item.originalText}</p>
                  </div>
                  
                  <div className="bg-green-100 p-2 rounded text-sm">
                    <span className="font-medium text-green-800">Translation:</span>
                    <p className="text-green-700 mt-1">{item.translatedText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
