'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Star, MapPin } from 'lucide-react';

const doctors = [
  {
    id: 1,
    name: 'Dr. Phos Gray',
    specialty: 'Orthopedic',
    rating: 4.8,
    distance: '1.2km',
    match: '99.371%',
    image: '👩‍⚕️',
  },
  {
    id: 2,
    name: 'Dr. Megumin Black',
    specialty: 'Neurologist',
    rating: 4.1,
    distance: '501m',
    image: '👨‍⚕️',
  },
  {
    id: 3,
    name: 'Dr. Akari Mizunami',
    specialty: 'Cardiologist',
    rating: 4.5,
    distance: '2.1km',
    image: '👩‍⚕️',
  },
  {
    id: 4,
    name: 'Dr. Walter White',
    specialty: 'Cardiologist',
    rating: 4.2,
    distance: '1.2km',
    image: '👨‍⚕️',
  },
];

const specialties = ['All', 'Cardiologist', 'Orthopedic', 'Neurologist', 'Pediatrics'];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All' || doctor.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Bold Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-primary/10 via-background to-background backdrop-blur-xl border-b-2 border-border/50 shadow-lg">
        <div className="p-4 space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            Browse All Doctors
          </motion.h1>
          
          {/* Specialty Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {specialties.map((specialty) => (
              <motion.button
                key={specialty}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSpecialty(specialty)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedSpecialty === specialty
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {specialty}
              </motion.button>
            ))}
          </div>
          
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-2 focus:border-primary"
            />
          </motion.div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {filteredDoctors.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {filteredDoctors[0].match && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Health Management System AI Recommendation</h2>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <Card className="p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-2xl rounded-2xl overflow-hidden">
                    {/* Blur effects */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="text-5xl"
                        >
                          {filteredDoctors[0].image}
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-bold text-2xl mb-1">{filteredDoctors[0].name}</h3>
                          <p className="text-base text-muted-foreground mb-3 font-medium">
                            {filteredDoctors[0].specialty}
                          </p>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-lg">
                              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                              <span className="text-base font-bold">
                                {filteredDoctors[0].rating}
                              </span>
                            </div>
                            <span className="text-muted-foreground">•</span>
                            <div className="flex items-center gap-1 text-base text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {filteredDoctors[0].distance}
                            </div>
                          </div>
                          <div className="px-3 py-1.5 bg-primary/20 rounded-lg inline-block mb-3">
                            <span className="text-sm font-bold text-primary">
                              {filteredDoctors[0].match} Match
                            </span>
                          </div>
                          <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-semibold rounded-xl shadow-lg">
                            Health Management System AI Match
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            )}

            <h2 className="text-2xl font-bold">
              Doctors Near You ({filteredDoctors.length})
            </h2>
            <div className="space-y-4">
              {filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="p-5 hover:shadow-xl transition-all cursor-pointer border-2 border-border/50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="text-4xl"
                      >
                        {doctor.image}
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-1">{doctor.name}</h3>
                        <p className="text-base text-muted-foreground mb-3 font-medium">
                          {doctor.specialty}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-bold">{doctor.rating}</span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {doctor.distance}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="lg" className="rounded-xl font-semibold">
                        View
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {filteredDoctors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg">No doctors found matching your criteria.</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
