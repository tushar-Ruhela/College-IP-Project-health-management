import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { CameraService } from './camera';
import { MobileService } from './mobile';

// Re-export services for convenience
export { CameraService } from './camera';
export { MobileService } from './mobile';

/**
 * Check if running on native platform with local files
 * Returns false if loading from remote URL (like Vercel) - use web APIs instead
 */
export const isNative = () => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  
  // If loading from a remote URL (like Vercel), treat as web
  // This allows us to use standard web APIs instead of Capacitor plugins
  if (typeof window !== 'undefined') {
    const currentUrl = window.location.origin;
    const isRemoteUrl = currentUrl && (
      currentUrl.includes('vercel.app') ||
      currentUrl.includes('http://') ||
      currentUrl.includes('https://')
    ) && !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1');
    
    if (isRemoteUrl) {
      console.log('Loading from remote URL, using web APIs instead of Capacitor plugins');
      return false;
    }
  }
  
  return true;
};

/**
 * Check if running on iOS
 */
export const isIOS = () => Capacitor.getPlatform() === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * Request camera permissions
 * Actually requests permissions using Capacitor Camera API
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const permissions = await CameraService.requestPermissions();
    return permissions.camera;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Check camera permissions status
 */
export async function checkCameraPermission(): Promise<boolean> {
  try {
    const permissions = await CameraService.checkPermissions();
    return permissions.camera;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
}

/**
 * Request microphone permissions
 * Note: Capacitor doesn't have a direct microphone permission API
 * Microphone permissions are typically requested when using getUserMedia
 * This function is kept for compatibility but returns true on native
 * as permissions will be requested by the browser/native when getUserMedia is called
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (!isNative()) {
    // On web, permissions are handled by browser when getUserMedia is called
    return true;
  }
  // On native, permissions are requested when getUserMedia is called
  // This is a placeholder for future microphone permission API if needed
  return true;
}

/**
 * Take a photo using native camera
 * Uses CameraService for proper permission handling
 */
export async function takePhoto(): Promise<string | null> {
  try {
    return await CameraService.takePhoto();
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Pick a photo from gallery
 * Uses CameraService for proper permission handling
 */
export async function pickPhoto(): Promise<string | null> {
  try {
    return await CameraService.pickFromGallery();
  } catch (error) {
    console.error('Error picking photo:', error);
    return null;
  }
}

/**
 * Save file to device
 */
export async function saveFile(data: string, filename: string, mimeType: string = 'text/plain'): Promise<boolean> {
  try {
    if (isNative()) {
      // For text files, write directly
      if (mimeType.startsWith('text/')) {
        await Filesystem.writeFile({
          path: filename,
          data: data,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      } else {
        // For binary files, convert base64 data URL to base64 string if needed
        const base64Data = data.startsWith('data:') 
          ? data.split(',')[1] 
          : data;

        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      }

      return true;
    } else {
      // Web fallback: download file
      const blob = data.startsWith('data:')
        ? await fetch(data).then(r => r.blob())
        : new Blob([data], { type: mimeType });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
}

/**
 * Trigger haptic feedback
 * Uses web vibration API when loading from remote URL
 */
export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.error('Error triggering haptic:', error);
    }
  } else {
    // Use web vibration API as fallback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50); // 50ms vibration
      } catch (error) {
        // Vibration not supported or failed
      }
    }
  }
}

/**
 * Set status bar style
 */
export async function setStatusBarStyle(style: Style = Style.Dark): Promise<void> {
  if (isNative()) {
    try {
      await StatusBar.setStyle({ style });
    } catch (error) {
      console.error('Error setting status bar style:', error);
    }
  }
}

/**
 * Get app info
 */
export async function getAppInfo() {
  if (isNative()) {
    try {
      return await App.getInfo();
    } catch (error) {
      console.error('Error getting app info:', error);
      return null;
    }
  }
  return null;
}

/**
 * Listen for app state changes
 */
export function onAppStateChange(callback: (state: { isActive: boolean }) => void) {
  if (isNative()) {
    App.addListener('appStateChange', callback);
    return () => {
      App.removeAllListeners();
    };
  }
  return () => {};
}

