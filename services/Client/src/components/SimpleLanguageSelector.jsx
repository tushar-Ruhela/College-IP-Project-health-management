import React from 'react';
import { Languages } from 'lucide-react';

const LANGUAGES = [
  { code: 'off', name: 'No Translation', flag: '🚫' },
  { code: 'auto', name: 'Auto Detect', flag: '🔍' },
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

export default function SimpleLanguageSelector({ 
  selectedLanguage = 'off', 
  onLanguageChange,
  className = '',
  label = "Listen in",
  isListening = false,
  error = null
}) {
  const getLanguageName = (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.flag} ${lang.name}` : '🚫 No Translation';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages size={16} className="text-white" />
      <span className="text-white text-sm font-medium">{label}:</span>
      <select
        value={selectedLanguage}
        onChange={(e) => {
          console.log('Language selector changed to:', e.target.value);
          onLanguageChange?.(e.target.value);
        }}
        className="bg-white/10 border border-white/30 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-white/50 min-w-36 text-white backdrop-blur-sm"
        style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          color: 'white',
          fontSize: '0.875rem'
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ color: '#1f2937', backgroundColor: 'white' }}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      
      {selectedLanguage !== 'off' && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
          error 
            ? 'bg-red-500/20 text-red-100 border-red-400/30' 
            : isListening 
              ? 'bg-green-500/20 text-green-100 border-green-400/30'
              : 'bg-blue-500/20 text-blue-100 border-blue-400/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            error 
              ? 'bg-red-400' 
              : isListening 
                ? 'bg-green-400 animate-pulse'
                : 'bg-blue-400'
          }`}></div>
          {error ? 'Error' : isListening ? 'Listening' : 'Ready'}
        </div>
      )}
    </div>
  );
}
