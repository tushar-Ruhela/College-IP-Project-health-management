'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function HealthAssessmentCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
    >
      <Card className="p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-[#83C818] flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-lg mb-1 text-gray-900">Health Assessment</h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Complete your health assessment to get personalized insights and recommendations.
            </p>
            <Link href="/assessment">
              <Button className="w-full bg-[#83C818] hover:bg-[#6BA014] text-white h-12 text-base font-bold rounded-xl shadow-lg">
                Start Assessment
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
