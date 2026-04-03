'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CameraService, CameraPermissions } from '@/lib/camera';
import { Capacitor } from '@capacitor/core';

interface PermissionsContextType {
  permissions: CameraPermissions;
  isLoading: boolean;
  requestPermissions: () => Promise<void>;
  checkPermissions: () => Promise<void>;
  isNative: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<CameraPermissions>({ camera: false, photos: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isNative] = useState(Capacitor.isNativePlatform());

  const checkPermissions = async () => {
    setIsLoading(true);
    try {
      const perms = await CameraService.checkPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const perms = await CameraService.requestPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return (
    <PermissionsContext.Provider value={{
      permissions,
      isLoading,
      requestPermissions,
      checkPermissions,
      isNative
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
