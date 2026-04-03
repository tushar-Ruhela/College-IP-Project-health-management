'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { setStorageItem, STORAGE_KEYS } from '@/lib/storage';

export default function PhoneNumberPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits (Indian mobile numbers)
    const limitedDigits = digits.slice(0, 10);
    
    // Format as: XXXX XXXXXX (4-6 split)
    if (limitedDigits.length <= 4) {
      return limitedDigits;
    } else if (limitedDigits.length <= 10) {
      return `${limitedDigits.slice(0, 4)} ${limitedDigits.slice(4)}`;
    }
    return limitedDigits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const getPhoneDigits = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const digits = getPhoneDigits(phone);
    // Indian mobile numbers: exactly 10 digits, starting with 6, 7, 8, or 9
    if (digits.length !== 10) {
      return false;
    }
    // First digit should be 6, 7, 8, or 9
    const firstDigit = parseInt(digits[0]);
    return firstDigit >= 6 && firstDigit <= 9;
  };

  const formatPhoneForStorage = (phone: string): string => {
    const digits = getPhoneDigits(phone);
    // Format as E.164: +91[10 digits]
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    return phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneForStorage(phoneNumber);
      
      // Check if user exists
      const response = await apiCall(`/api/users/check/${encodeURIComponent(formattedPhone)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to check user');
      }

      const data = await response.json();

      // Store phone number in localStorage
      setStorageItem(STORAGE_KEYS.USER_INFO, {
        phoneNumber: formattedPhone,
      });

      if (data.exists && data.user) {
        // User exists - go to OTP screen
        router.push(`/onboarding/otp?phone=${encodeURIComponent(formattedPhone)}`);
      } else {
        // New user - go to name/age screen
        router.push(`/onboarding/info?phone=${encodeURIComponent(formattedPhone)}`);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setError(error instanceof Error ? error.message : 'Failed to check user. Please try again.');
    } finally {
      setIsChecking(false);
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
            Enter your phone number
          </h1>
          <p className="text-muted-foreground">
            We&apos;ll use this to identify you
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="9876 543210"
              value={phoneNumber}
              onChange={handlePhoneChange}
              required
              maxLength={11} // 10 digits + 1 space
              className="h-12"
              disabled={isChecking}
            />
            <p className="text-xs text-muted-foreground">
              Enter your 10-digit Indian mobile number (starts with 6, 7, 8, or 9)
            </p>
            {phoneNumber && !validatePhoneNumber(phoneNumber) && (
              <p className="text-xs text-red-500 mt-1">
                Please enter a valid 10-digit Indian mobile number
              </p>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!phoneNumber || !validatePhoneNumber(phoneNumber) || isChecking}
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Checking...
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



