'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { setStorageItem, getStorageItem, STORAGE_KEYS } from '@/lib/storage';

function OTPForm() {
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone');

  useEffect(() => {
    if (!phoneNumber) {
      router.push('/onboarding/phone');
    }
  }, [phoneNumber, router]);

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setOtp(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Dummy OTP validation - accept any 4 digits
    if (otp.length === 4) {
      // Get existing user info and update
      const userInfo = getStorageItem<{ phoneNumber?: string }>(STORAGE_KEYS.USER_INFO) || {};
      
      // Mark onboarding as complete
      setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
      setStorageItem(STORAGE_KEYS.USER_INFO, {
        ...userInfo,
        phoneNumber: phoneNumber || userInfo.phoneNumber,
      });
      
      router.push('/home');
    }
  };

  if (!phoneNumber) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Enter OTP
          </h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a 4-digit code to {phoneNumber}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            (For now, enter any 4-digit code)
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="1234"
              value={otp}
              onChange={handleOTPChange}
              required
              maxLength={4}
              className="h-12 text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 4-digit code
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={otp.length !== 4}
            >
              Verify
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <OTPForm />
    </Suspense>
  );
}



