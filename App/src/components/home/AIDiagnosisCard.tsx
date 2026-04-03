'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function AIDiagnosisCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: 0.2,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="p-6 bg-gradient-to-br from-[#5A8A12] via-[#6BA014] to-[#5A8A12] border-[#5A8A12]/50 overflow-hidden relative shadow-2xl rounded-2xl hover:shadow-[0_20px_50px_-12px_rgba(90,138,18,0.4)] transition-shadow duration-300">
        {/* Multiple blur effects */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex-shrink-0"
            >
              <Brain className="w-8 h-8 text-white" />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-extrabold text-white">AI Diagnosis</h3>
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-5 h-5 text-white/90" />
                </motion.div>
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                Get instant health insights with our AI-powered assessment. Describe your symptoms and get preliminary guidance through voice conversation.
              </p>
            </div>
          </div>
          <Link href="/ai-diagnosis">
            <Button
              variant="secondary"
              className="w-full bg-white text-[#5A8A12] hover:bg-gray-50 h-12 text-base font-extrabold rounded-xl shadow-lg"
            >
              Start AI Assessment
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
