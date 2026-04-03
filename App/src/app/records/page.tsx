'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Download, Search, Stethoscope, Pill, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { saveFile, triggerHaptic } from '@/lib/capacitor';

interface MedicalRecord {
  id: string;
  type: 'consultation' | 'prescription' | 'lab' | 'vaccination';
  title: string;
  date: Date;
  doctor?: string;
  description: string;
  status: 'completed' | 'pending' | 'upcoming';
}

const records: MedicalRecord[] = [
  {
    id: '1',
    type: 'consultation',
    title: 'General Health Checkup',
    date: new Date('2024-11-20'),
    doctor: 'Dr. Sarah Johnson',
    description: 'Routine health checkup. All vitals normal.',
    status: 'completed',
  },
  {
    id: '2',
    type: 'prescription',
    title: 'Prescription - Antibiotics',
    date: new Date('2024-11-18'),
    doctor: 'Dr. Michael Chen',
    description: 'Amoxicillin 500mg - 7 days course',
    status: 'completed',
  },
  {
    id: '3',
    type: 'lab',
    title: 'Blood Test Results',
    date: new Date('2024-11-15'),
    doctor: 'Dr. Sarah Johnson',
    description: 'Complete blood count, cholesterol, glucose levels',
    status: 'completed',
  },
  {
    id: '4',
    type: 'vaccination',
    title: 'Flu Vaccination',
    date: new Date('2024-11-10'),
    description: 'Annual flu shot administered',
    status: 'completed',
  },
  {
    id: '5',
    type: 'consultation',
    title: 'Follow-up Appointment',
    date: new Date('2024-11-25'),
    doctor: 'Dr. Sarah Johnson',
    description: 'Follow-up for previous consultation',
    status: 'upcoming',
  },
  {
    id: '6',
    type: 'lab',
    title: 'X-Ray - Chest',
    date: new Date('2024-11-12'),
    doctor: 'Dr. Michael Chen',
    description: 'Chest X-ray examination',
    status: 'completed',
  },
];

const typeIcons = {
  consultation: Stethoscope,
  prescription: Pill,
  lab: Activity,
  vaccination: FileText,
};

const typeColors = {
  consultation: 'bg-blue-500/10 text-blue-500',
  prescription: 'bg-purple-500/10 text-purple-500',
  lab: 'bg-green-500/10 text-green-500',
  vaccination: 'bg-orange-500/10 text-orange-500',
};

export default function RecordsPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = records.filter((record) => {
    const matchesFilter = selectedFilter === 'all' || record.type === selectedFilter;
    const matchesSearch = record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.doctor?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const groupedRecords = filteredRecords.reduce<Record<string, MedicalRecord[]>>((acc, record) => {
    const dateKey = record.date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(record);
    return acc;
  }, {});

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
              Medical Records
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/70 text-sm mb-4"
            >
              Your complete health history
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative mb-4"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-[#1f2a22] border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
              />
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            >
              {['all', 'consultation', 'prescription', 'lab', 'vaccination'].map((filter) => (
                <motion.button
                  key={filter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedFilter === filter
                      ? 'bg-[#83C818] text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </motion.button>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Records List */}
      <div className="p-4 space-y-6">
        {Object.entries(groupedRecords).map(([date, dateRecords], groupIndex) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + groupIndex * 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{date}</h2>
            </div>

            {dateRecords.map((record, index) => {
              const Icon = typeIcons[record.type];
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + groupIndex * 0.1 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="p-4 border-2 border-border/50 rounded-2xl hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${typeColors[record.type]} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-extrabold text-gray-900 mb-1">{record.title}</h3>
                            {record.doctor && (
                              <p className="text-sm text-muted-foreground">by {record.doctor}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            record.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'upcoming'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{record.description}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={async () => {
                              await triggerHaptic();
                              // Generate a sample PDF content (in real app, this would come from API)
                              const pdfContent = `Medical Record: ${record.title}\nDate: ${record.date.toLocaleDateString()}\nDoctor: ${record.doctor || 'N/A'}\nDescription: ${record.description}\nStatus: ${record.status}`;
                              const filename = `${record.title.replace(/\s+/g, '_')}_${record.date.toISOString().split('T')[0]}.txt`;
                              await saveFile(pdfContent, filename, 'text/plain');
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={async () => {
                              await triggerHaptic();
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ))}

        {filteredRecords.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No records found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

