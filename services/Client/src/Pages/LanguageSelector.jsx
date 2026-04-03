import React, { useState } from 'react';
import { Globe, ArrowRight } from 'lucide-react';

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
];

export default function LanguageSelector({ onSelect }) {
  const [selectedLang, setSelectedLang] = useState('en');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-10 max-w-2xl w-11/12 shadow-2xl">
        <div className="text-center mb-8">
          <Globe size={64} className="text-blue-500 mx-auto mb-4" />
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            🌍 Smart Translation
          </h2>
          <p className="text-gray-600 text-lg">
            Select your preferred language for this video call
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                selectedLang === lang.code
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <span className={`font-semibold ${
                selectedLang === lang.code ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {lang.name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => onSelect(selectedLang)}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl text-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all hover:scale-105"
        >
          Continue to Call
          <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}
