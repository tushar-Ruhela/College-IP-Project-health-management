import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface CameraPermissions {
  camera: boolean;
  photos: boolean;
}

export class CameraService {
  /**
   * Check if we should use Capacitor plugins or web APIs
   */
  private static shouldUseCapacitor(): boolean {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    
    // If loading from remote URL, use web APIs
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.origin;
      const isRemoteUrl = currentUrl && (
        currentUrl.includes('vercel.app') ||
        (currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) &&
        !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')
      );
      
      if (isRemoteUrl) {
        return false; // Use web APIs
      }
    }
    
    return true; // Use Capacitor plugins
  }

  static async requestPermissions(): Promise<CameraPermissions> {
    try {
      if (!this.shouldUseCapacitor()) {
        // For web or remote URL, permissions are handled by browser
        return { camera: true, photos: true };
      }

      const permissions = await Camera.requestPermissions();
      return {
        camera: permissions.camera === 'granted',
        photos: permissions.photos === 'granted'
      };
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return { camera: false, photos: false };
    }
  }

  static async checkPermissions(): Promise<CameraPermissions> {
    try {
      if (!this.shouldUseCapacitor()) {
        // For web or remote URL, assume permissions available
        return { camera: true, photos: true };
      }

      const permissions = await Camera.checkPermissions();
      return {
        camera: permissions.camera === 'granted',
        photos: permissions.photos === 'granted'
      };
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return { camera: false, photos: false };
    }
  }

  static async takePhoto(options?: {
    quality?: number;
    source?: CameraSource;
    direction?: CameraDirection;
  }): Promise<string | null> {
    try {
      if (!this.shouldUseCapacitor()) {
        // Web fallback - use file input with camera capture
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment'; // Use rear camera on mobile
          
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve(null);
              return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              reject(new Error('Failed to read image'));
            };
            reader.readAsDataURL(file);
          };
          
          input.oncancel = () => {
            resolve(null);
          };
          
          input.click();
        });
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission.camera) {
        throw new Error('Camera permission denied');
      }

      const image = await Camera.getPhoto({
        quality: options?.quality || 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: options?.source || CameraSource.Camera,
        direction: options?.direction || CameraDirection.Rear
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  static async pickFromGallery(): Promise<string | null> {
    try {
      if (!this.shouldUseCapacitor()) {
        // Web fallback - use file input for gallery
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          // No capture attribute = opens gallery/file picker
          
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve(null);
              return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              reject(new Error('Failed to read image'));
            };
            reader.readAsDataURL(file);
          };
          
          input.oncancel = () => {
            resolve(null);
          };
          
          input.click();
        });
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission.photos) {
        throw new Error('Photos permission denied');
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('Error picking from gallery:', error);
      throw error;
    }
  }
}


