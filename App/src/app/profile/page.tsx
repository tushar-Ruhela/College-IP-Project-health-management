'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { User, ClipboardCheck, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<{ name: string; age: number } | null>(null);
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState(false);

  useEffect(() => {
    const info = getStorageItem<{ name: string; age: number }>(STORAGE_KEYS.USER_INFO);
    setUserInfo(info);

    const assessmentComplete = getStorageItem<boolean>(
      STORAGE_KEYS.HEALTH_ASSESSMENT_COMPLETE
    );
    setHasCompletedAssessment(!!assessmentComplete);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{userInfo?.name || 'User'}</h2>
                <p className="text-sm text-muted-foreground">
                  Age: {userInfo?.age || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-3">Health Assessment</h3>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {hasCompletedAssessment ? 'Assessment Completed' : 'Not Completed'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasCompletedAssessment
                      ? 'You can retake the assessment'
                      : 'Complete your health assessment'}
                  </p>
                </div>
              </div>
              <Link href="/assessment">
                <Button variant={hasCompletedAssessment ? 'outline' : 'default'}>
                  {hasCompletedAssessment ? 'Retake' : 'Start'}
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h3 className="text-lg font-semibold">Settings</h3>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <span>Settings</span>
              </div>
              <Button variant="ghost" size="icon">
                →
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Logout functionality
              alert('Logout functionality coming soon');
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

