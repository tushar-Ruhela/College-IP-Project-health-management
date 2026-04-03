import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

export class MobileService {
  /**
   * Check if we should use Capacitor plugins or web APIs
   */
  private static shouldUseCapacitor(): boolean {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    
    // If loading from remote URL, skip Capacitor plugins
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.origin;
      const isRemoteUrl = currentUrl && (
        currentUrl.includes('vercel.app') ||
        (currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) &&
        !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')
      );
      
      if (isRemoteUrl) {
        return false; // Skip Capacitor plugins
      }
    }
    
    return true; // Use Capacitor plugins
  }

  static async hideSplashScreen() {
    try {
      if (!this.shouldUseCapacitor()) {
        // No-op for web or remote URL
        return;
      }
      
      await SplashScreen.hide({
        fadeOutDuration: 300
      });
    } catch (error) {
      console.error('Error hiding splash screen:', error);
    }
  }

  static async showSplashScreen() {
    try {
      if (!this.shouldUseCapacitor()) {
        // No-op for web or remote URL
        return;
      }
      
      await SplashScreen.show({
        showDuration: 2000,
        fadeInDuration: 300,
        fadeOutDuration: 300,
        autoHide: true
      });
    } catch (error) {
      console.error('Error showing splash screen:', error);
    }
  }

  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static getPlatform(): string {
    return Capacitor.getPlatform();
  }
}


