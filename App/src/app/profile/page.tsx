'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { User, ClipboardCheck, Settings, LogOut, Bell, Shield, Moon, Globe, HelpCircle, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<{ name: string; age: number } | null>(null);
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
              <Button asChild variant={hasCompletedAssessment ? 'outline' : 'default'}>
                <Link href="/assessment">
                  {hasCompletedAssessment ? 'Retake' : 'Start'}
                </Link>
              </Button>
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
          <Card 
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsSettingsOpen(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <span>App Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
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

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={() => setIsSettingsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-3xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Settings</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Notifications */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Bell className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive daily health reminders</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${notificationsEnabled ? 'bg-[#83C818]' : 'bg-gray-300'}`}
                  >
                    <motion.div
                      className="w-4 h-4 bg-white rounded-full shadow-md"
                      animate={{ x: notificationsEnabled ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <Moon className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Toggle app appearance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDarkMode(!darkMode);
                      alert('Dark mode toggle functionality coming soon!');
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-[#83C818]' : 'bg-gray-300'}`}
                  >
                    <motion.div
                      className="w-4 h-4 bg-white rounded-full shadow-md"
                      animate={{ x: darkMode ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Language */}
                <div 
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => alert('Language options coming soon!')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-xl">
                      <Globe className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Language</p>
                      <p className="text-xs text-muted-foreground">English (US)</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Privacy */}
                <div 
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => alert('Privacy policy coming soon!')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                      <Shield className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Privacy & Security</p>
                      <p className="text-xs text-muted-foreground">Manage your data</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Help */}
                <div 
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => alert('Help center coming soon!')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-xl">
                      <HelpCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Help & Support</p>
                      <p className="text-xs text-muted-foreground">Get assistance</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

