'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStorageItem, STORAGE_KEYS } from '@/lib/storage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const onboardingComplete = getStorageItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
    const userInfo = getStorageItem(STORAGE_KEYS.USER_INFO);

    if (!onboardingComplete || !userInfo) {
      router.push('/onboarding/phone');
    } else {
      router.push('/home');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
