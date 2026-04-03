'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { HealthAssessmentCard } from '@/components/home/HealthAssessmentCard';
import { HealthMetrics } from '@/components/home/HealthMetrics';
import { AIDiagnosisCard } from '@/components/home/AIDiagnosisCard';
import { getStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { Bell, Search, Plus, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [userName, setUserName] = useState('');
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userInfo = getStorageItem<{ name: string }>(STORAGE_KEYS.USER_INFO);
    if (userInfo) {
      setUserName(userInfo.name);
    } else {
      router.push('/onboarding/info');
    }

    const assessmentComplete = getStorageItem<boolean>(
      STORAGE_KEYS.HEALTH_ASSESSMENT_COMPLETE
    );
    setHasCompletedAssessment(!!assessmentComplete);
  }, [router]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Dark Green Header Card - Polished Design */}
      <div className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2F3C31] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background blur effects */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/3 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            {/* Top bar with date, locale switcher, and notification */}
            <div className="flex items-center justify-between mb-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-white/70" />
                <span className="text-white/90 text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </span>
              </motion.div>
              <div className="flex items-center gap-2">
                {/* Notification Bell */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-5 h-5 text-white/90" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#2F3C31]" />
                </motion.button>
              </div>
            </div>

            {/* User greeting section with inline avatar */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg"
              >
                👤
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-extrabold text-white mb-3"
                >
                  Hello, {userName || 'User'}! 👋
                </motion.h1>
                
                {/* Badges with better styling */}
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="px-4 py-2 rounded-xl bg-[#83C818] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    87% Score
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="px-4 py-2 rounded-xl bg-yellow-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                  >
                    ⭐ Pro Member
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Search bar - Darker with neumorphism */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#1f2a22] border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 text-base font-medium shadow-inner transition-all duration-200"
                style={{
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(255, 255, 255, 0.1)'
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-6 bg-white">
        {!hasCompletedAssessment && <HealthAssessmentCard />}

        {/* Health Insights Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-gray-900">Health Insights</h2>
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="w-1 h-1 bg-gray-400 rounded-full mx-1" />
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {/* Heart Rate Card - Vibrant Lime Green */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 0.9,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
              whileHover={{ 
                scale: 1.05,
                y: -4,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-2xl bg-[#83C818] p-4 shadow-xl hover:shadow-2xl transition-shadow duration-200 flex-shrink-0 w-[140px]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs font-bold">Heart Rate</span>
                  <span className="text-white text-lg">❤️</span>
                </div>
                <p className="text-white text-3xl font-extrabold mb-1">97</p>
                <p className="text-white/90 text-xs font-semibold mb-3">bpm</p>
                {/* Line graph */}
                <div className="h-10 bg-white/20 rounded-lg flex items-end gap-0.5 p-1">
                  {[0.3, 0.6, 0.4, 0.7, 0.5, 0.8, 0.6].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height * 100}%` }}
                      transition={{ delay: 0.9 + i * 0.1, duration: 0.3 }}
                      className="flex-1 bg-white rounded-sm"
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Steps Taken Card - Bright Red/Pink */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 1.0,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
              whileHover={{ 
                scale: 1.05,
                y: -4,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-2xl bg-[#ef4444] p-4 shadow-xl hover:shadow-2xl transition-shadow duration-200 flex-shrink-0 w-[140px]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs font-bold">Steps Taken</span>
                  <span className="text-white text-lg">👣</span>
                </div>
                <p className="text-white text-3xl font-extrabold mb-1">1578</p>
                <p className="text-white/90 text-xs font-semibold mb-3">total</p>
                {/* Bar chart */}
                <div className="h-10 bg-white/20 rounded-lg flex items-end gap-0.5 p-1">
                  {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.7].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height * 100}%` }}
                      transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
                      className="flex-1 bg-white rounded-sm"
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Hydration Card - Bright Blue */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 1.1,
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
              whileHover={{ 
                scale: 1.05,
                y: -4,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden rounded-2xl bg-[#3b82f6] p-4 shadow-xl hover:shadow-2xl transition-shadow duration-200 flex-shrink-0 w-[140px]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-xs font-bold">Hydration</span>
                  <span className="text-white text-lg">💧</span>
                </div>
                <p className="text-white text-3xl font-extrabold mb-1">875</p>
                <p className="text-white/90 text-xs font-semibold mb-3">ml</p>
                {/* Water level indicator */}
                <div className="h-10 bg-white/20 rounded-lg relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ delay: 1.1, duration: 0.5 }}
                    className="absolute bottom-0 left-0 h-full bg-white/50 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-t from-white/30 to-transparent rounded-lg" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Virtual Consultations Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-gray-900">Virtual Consultations</h2>
            <motion.button
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="w-5 h-5 flex items-center justify-center text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </motion.button>
          </div>
          
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 1.2,
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
              className="rounded-2xl bg-gray-50 border-2 border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <p className="text-6xl font-extrabold text-[#2F3C31] mb-2">1224+</p>
              <p className="text-lg font-bold text-gray-700">Upcoming Appointments</p>
            </motion.div>
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                delay: 1.4,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              whileHover={{ 
                scale: 1.1,
                rotate: 90,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.9 }}
              className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-[#83C818] shadow-2xl hover:shadow-[0_0_30px_rgba(131,200,24,0.5)] flex items-center justify-center text-white transition-shadow duration-200"
            >
              <Plus className="w-7 h-7" />
            </motion.button>
          </div>
        </motion.div>

        {/* AI Diagnosis Card */}
        <AIDiagnosisCard />

        {/* Health Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Health Overview</h2>
          <HealthMetrics />
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
