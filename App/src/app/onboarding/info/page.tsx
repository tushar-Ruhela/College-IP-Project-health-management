'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setStorageItem, getStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { apiCall } from '@/lib/api';

function BasicInfoForm() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumberParam = searchParams.get('phone');

  useEffect(() => {
    if (!phoneNumberParam) {
      router.push('/onboarding/phone');
    }
  }, [phoneNumberParam, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !phoneNumberParam) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user in backend
      const response = await apiCall('/api/users/create', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: phoneNumberParam,
          name,
          age: parseInt(age),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      const data = await response.json();

      // Store user info in localStorage
      setStorageItem(STORAGE_KEYS.USER_INFO, {
        name,
        age: parseInt(age),
        phoneNumber: phoneNumberParam,
      });

      // Mark onboarding as complete
      setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);

      router.push('/home');
    } catch (error) {
      console.error('Error creating user:', error);
      // Still proceed to home even if backend fails
      setStorageItem(STORAGE_KEYS.USER_INFO, {
        name,
        age: parseInt(age),
        phoneNumber: phoneNumberParam,
      });
      setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
      router.push('/home');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Tell us about yourself
          </h1>
          <p className="text-muted-foreground">
            We&apos;ll use this to personalize your experience
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              placeholder="Enter your age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min="1"
              max="120"
              className="h-12"
            />
          </motion.div>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!name || !age || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}

export default function BasicInfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <BasicInfoForm />
    </Suspense>
  );
}

