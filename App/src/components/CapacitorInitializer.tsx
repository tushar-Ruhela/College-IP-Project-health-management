'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

export function CapacitorInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const initCapacitor = async () => {
      // Check if running on native platform with local files
      // Skip if loading from remote URL (like Vercel) - use web APIs instead
      if (!Capacitor.isNativePlatform()) {
        return;
      }
      
      // Check if loading from remote URL
      const currentUrl = window.location.origin;
      const isRemoteUrl = currentUrl && (
        currentUrl.includes('vercel.app') ||
        (currentUrl.includes('http://') || currentUrl.includes('https://')) &&
        !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')
      );
      
      if (isRemoteUrl) {
        console.log('Skipping Capacitor plugins - loading from remote URL, using web APIs');
        return;
      }
      
      // Only use Capacitor plugins when loading from local files
        try {
          // Set status bar style
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#83C818' });

          // Hide splash screen after a short delay
          setTimeout(async () => {
            await SplashScreen.hide();
          }, 2000);

          // Handle app state changes
          App.addListener('appStateChange', (state) => {
            console.log('App state changed:', state.isActive ? 'active' : 'inactive');
          });

          // Handle back button on Android
          App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
              App.exitApp();
            } else {
              window.history.back();
            }
          });
        } catch (error) {
          console.error('Error initializing Capacitor:', error);
      }
    };

    initCapacitor();
  }, []);

  return null;
}

