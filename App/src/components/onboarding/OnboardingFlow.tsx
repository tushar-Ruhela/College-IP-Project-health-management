'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingStep } from './OnboardingStep';
import { Heart, Stethoscope, Brain } from 'lucide-react';
import { setStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { useRouter } from 'next/navigation';

const steps = [
  {
    title: 'Your Health, Simplified',
    description: 'Access professional healthcare guidance right from your phone. Get personalized health insights and connect with doctors instantly.',
    icon: <Heart className="w-32 h-32 text-[#83C818]" strokeWidth={1.5} fill="none" />,
  },
  {
    title: 'AI-Powered Diagnosis',
    description: 'Our advanced AI assistant helps you understand your symptoms and provides preliminary health assessments before you see a doctor.',
    icon: <Brain className="w-32 h-32 text-[#83C818]" strokeWidth={1.5} fill="none" />,
  },
  {
    title: 'Virtual Consultations',
    description: 'Book appointments, have video consultations, and manage your health records all in one place. Healthcare made convenient.',
    icon: <Stethoscope className="w-32 h-32 text-[#83C818]" strokeWidth={1.5} fill="none" />,
  },
];

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
      router.push('/onboarding/info');
    }
  };

  const handleSkip = () => {
    setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    router.push('/onboarding/info');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* White card panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Content area */}
        <div className="flex-1 flex items-center justify-center p-8 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="w-full"
            >
              <OnboardingStep
                title={steps[currentStep].title}
                description={steps[currentStep].description}
                icon={steps[currentStep].icon}
                isActive={true}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom navigation */}
        <div className="p-6 pt-4 border-t border-gray-100">
          {/* Pagination dots */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  scale: currentStep === index ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  currentStep === index
                    ? 'bg-[#83C818]'
                    : 'border-2 border-[#83C818] bg-white'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Skip button */}
            {currentStep < steps.length - 1 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSkip}
                className="flex items-center gap-2 text-gray-600 font-medium hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">N</span>
                </div>
                <span>Skip</span>
              </motion.button>
            )}
            
            {/* Spacer */}
            <div className="flex-1" />

            {/* Next button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className="px-8 py-3.5 bg-[#83C818] text-white font-bold rounded-2xl shadow-lg hover:bg-[#6BA014] transition-colors min-w-[120px]"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
