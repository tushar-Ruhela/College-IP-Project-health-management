'use client';

import { CapacitorInitializer } from '@/components/CapacitorInitializer';

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CapacitorInitializer />
      {children}
    </>
  );
}

