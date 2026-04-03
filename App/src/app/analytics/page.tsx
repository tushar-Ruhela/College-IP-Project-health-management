'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown, Activity, Heart, Droplet, Apple } from 'lucide-react';

const weeklyData = [
  { day: 'Mon', steps: 8500, heartRate: 72, hydration: 1800 },
  { day: 'Tue', steps: 9200, heartRate: 75, hydration: 2000 },
  { day: 'Wed', steps: 7800, heartRate: 70, hydration: 1700 },
  { day: 'Thu', steps: 10500, heartRate: 78, hydration: 2200 },
  { day: 'Fri', steps: 8800, heartRate: 73, hydration: 1900 },
  { day: 'Sat', steps: 12000, heartRate: 80, hydration: 2400 },
  { day: 'Sun', steps: 9500, heartRate: 76, hydration: 2100 },
];

const metrics = [
  { 
    label: 'Average Heart Rate', 
    value: '74 bpm', 
    change: '+2.3%', 
    trend: 'up',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  { 
    label: 'Daily Steps', 
    value: '9,471', 
    change: '+12.5%', 
    trend: 'up',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  { 
    label: 'Hydration', 
    value: '2.0L', 
    change: '-5.2%', 
    trend: 'down',
    icon: Droplet,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  { 
    label: 'Calories Burned', 
    value: '2,340', 
    change: '+8.1%', 
    trend: 'up',
    icon: Apple,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
];

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2F3C31] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/3 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-extrabold text-white mb-2"
            >
              Health Analytics
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/70 text-sm"
            >
              Track your health metrics and progress
            </motion.p>

            {/* Period Selector */}
            <div className="flex gap-2 mt-4">
              {['day', 'week', 'month'].map((period) => (
                <motion.button
                  key={period}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedPeriod === period
                      ? 'bg-[#83C818] text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card className="p-4 hover:shadow-lg transition-all duration-200 border-2 border-border/50 rounded-2xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-xl ${metric.bgColor}`}>
                      <Icon className={`w-5 h-5 ${metric.color}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${
                      metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {metric.change}
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 mb-1">{metric.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{metric.label}</p>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 border-2 border-border/50 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-gray-900">Weekly Overview</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {/* Steps Chart */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Steps</p>
                <p className="text-xs text-muted-foreground">Avg: 9,471</p>
              </div>
              <div className="flex items-end gap-2 h-32">
                {weeklyData.map((data, index) => {
                  const maxSteps = Math.max(...weeklyData.map(d => d.steps));
                  const height = (data.steps / maxSteps) * 100;
                  return (
                    <motion.div
                      key={data.day}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.5, type: "spring" }}
                      className="flex-1 bg-gradient-to-t from-[#83C818] to-[#6BA014] rounded-t-lg relative group"
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {data.steps.toLocaleString()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                {weeklyData.map((data) => (
                  <div key={data.day} className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground font-medium">{data.day}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Heart Rate Chart */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Heart Rate (bpm)</p>
                <p className="text-xs text-muted-foreground">Avg: 74</p>
              </div>
              <div className="flex items-end gap-2 h-24">
                {weeklyData.map((data, index) => {
                  const maxHR = Math.max(...weeklyData.map(d => d.heartRate));
                  const minHR = Math.min(...weeklyData.map(d => d.heartRate));
                  const height = ((data.heartRate - minHR) / (maxHR - minHR)) * 100;
                  return (
                    <motion.div
                      key={data.day}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.5, type: "spring" }}
                      className="flex-1 bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg"
                    />
                  );
                })}
              </div>
            </div>

            {/* Hydration Chart */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Hydration (ml)</p>
                <p className="text-xs text-muted-foreground">Avg: 2.0L</p>
              </div>
              <div className="flex items-end gap-2 h-24">
                {weeklyData.map((data, index) => {
                  const maxHydration = Math.max(...weeklyData.map(d => d.hydration));
                  const height = (data.hydration / maxHydration) * 100;
                  return (
                    <motion.div
                      key={data.day}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.5, type: "spring" }}
                      className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t-lg"
                    />
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">Insights</h2>
          <div className="space-y-3">
            {[
              { title: 'Great Progress!', description: 'Your step count has increased by 12.5% this week', type: 'success' },
              { title: 'Stay Hydrated', description: 'Try to maintain 2.5L of water intake daily', type: 'info' },
              { title: 'Consistent Heart Rate', description: 'Your heart rate is within healthy range', type: 'success' },
            ].map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <Card className={`p-4 border-l-4 ${
                  insight.type === 'success' ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
                } rounded-xl`}>
                  <h3 className="font-bold text-gray-900 mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}


