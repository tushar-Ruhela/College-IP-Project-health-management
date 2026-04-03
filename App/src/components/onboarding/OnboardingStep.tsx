'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface OnboardingStepProps {
  title: string;
  description: string;
  icon: ReactNode;
  isActive: boolean;
}

export function OnboardingStep({ title, description, icon, isActive }: OnboardingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isActive ? 1 : 0.5, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full px-6"
    >
      {/* Large outlined icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: isActive ? 1 : 0.8, opacity: isActive ? 1 : 0.5 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-12"
      >
        {icon}
      </motion.div>
      
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isActive ? 1 : 0.5, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-extrabold text-gray-900 mb-6 text-center"
      >
        {title}
      </motion.h2>
      
      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isActive ? 1 : 0.5, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-gray-600 text-center max-w-md text-base leading-relaxed"
      >
        {description}
      </motion.p>
    </motion.div>
  );
}
