'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, Calendar, Pill, Building2 } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { getStorageItem, STORAGE_KEYS } from '@/lib/storage';
import { CameraService } from '@/lib/camera';

interface UserInfo {
  phoneNumber?: string;
  name?: string;
}

interface MedicineData {
  medicineName: string;
  genericName?: string;
  manufacturer?: string;
  expiryDate?: string;
  batchNumber?: string;
  purpose: string;
  dosage?: string;
  form?: string;
  language?: string;
  expiryStatus?: 'valid' | 'expired' | 'expiring_soon' | 'unknown';
  warnings?: string;
}

export default function MediScanPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; medicine?: MedicineData; error?: string; note?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userInfo = getStorageItem<UserInfo>(STORAGE_KEYS.USER_INFO) || {};

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setImagePreview(result);
        setError(null);
        setScanResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const photo = await CameraService.takePhoto({
        quality: 90,
        // Use Capacitor enum type so TypeScript is happy; CameraService
        // already falls back to web capture on non-native platforms.
        source: undefined
      });
      
      if (photo) {
        setSelectedImage(photo);
        setImagePreview(photo);
        setError(null);
        setScanResult(null);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setError(error.message || 'Failed to capture photo');
    }
  };

  const handleGalleryPick = async () => {
    try {
      const photo = await CameraService.pickFromGallery();
      
      if (photo) {
        setSelectedImage(photo);
        setImagePreview(photo);
        setError(null);
        setScanResult(null);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      setError(error.message || 'Failed to pick image from gallery');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setScanResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScan = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await apiCall('/api/mediscan', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: selectedImage,
          language: 'en', // Can be made dynamic based on user preference
          phoneNumber: userInfo.phoneNumber || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to scan medicine' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to scan medicine');
      }

      setScanResult(data);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to scan medicine. Please try again.');
      setScanResult({
        success: false,
        error: err.message || 'Failed to scan medicine'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not found';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getExpiryStatusColor = (status?: string) => {
    switch (status) {
      case 'expired':
        return 'text-red-500';
      case 'expiring_soon':
        return 'text-yellow-500';
      case 'valid':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getExpiryStatusText = (status?: string) => {
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'expiring_soon':
        return 'Expiring Soon';
      case 'valid':
        return 'Valid';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MediScan</h1>
          <p className="text-gray-600">Scan medicine packages to get instant information</p>
        </div>

        {/* Image Upload Section */}
        <Card className="p-6 mb-6">
          {!imagePreview ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                <Pill className="w-16 h-16 text-blue-500 mb-4" />
                <p className="text-gray-600 mb-4 text-center">
                  Upload or capture a photo of your medicine package
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleCameraCapture}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Camera className="w-4 h-4" />
                    Camera
                  </Button>
                  <Button
                    onClick={handleGalleryPick}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4" />
                    Gallery
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Medicine package"
                  className="w-full h-auto rounded-lg border border-gray-200"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full"
                size="lg"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Pill className="w-4 h-4 mr-2" />
                    Scan Medicine
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </Card>
        )}

        {/* Scan Results */}
        <AnimatePresence>
          {scanResult && scanResult.success && scanResult.medicine && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">Medicine Information</h2>
                </div>

                <div className="space-y-4">
                  {/* Medicine Name */}
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                      <Pill className="w-4 h-4" />
                      Medicine Name
                    </h3>
                    <p className="text-gray-900 text-lg">{scanResult.medicine.medicineName}</p>
                    {scanResult.medicine.genericName && (
                      <p className="text-sm text-gray-600 mt-1">
                        Generic: {scanResult.medicine.genericName}
                      </p>
                    )}
                  </div>

                  {/* Expiry Date */}
                  {scanResult.medicine.expiryDate && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Expiry Date
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900">
                          {formatDate(scanResult.medicine.expiryDate)}
                        </p>
                        <span className={`text-sm font-medium ${getExpiryStatusColor(scanResult.medicine.expiryStatus)}`}>
                          ({getExpiryStatusText(scanResult.medicine.expiryStatus)})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Purpose */}
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Purpose</h3>
                    <p className="text-gray-900">{scanResult.medicine.purpose}</p>
                  </div>

                  {/* Dosage & Form */}
                  {(scanResult.medicine.dosage || scanResult.medicine.form) && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">Dosage & Form</h3>
                      <p className="text-gray-900">
                        {scanResult.medicine.dosage && `${scanResult.medicine.dosage} `}
                        {scanResult.medicine.form}
                      </p>
                    </div>
                  )}

                  {/* Manufacturer */}
                  {scanResult.medicine.manufacturer && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Manufacturer
                      </h3>
                      <p className="text-gray-900">{scanResult.medicine.manufacturer}</p>
                    </div>
                  )}

                  {/* Batch Number */}
                  {scanResult.medicine.batchNumber && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">Batch Number</h3>
                      <p className="text-gray-900 font-mono text-sm">{scanResult.medicine.batchNumber}</p>
                    </div>
                  )}

                  {/* Warnings */}
                  {scanResult.medicine.warnings && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-yellow-700 mb-1">Warnings</h3>
                      <p className="text-yellow-800 text-sm">{scanResult.medicine.warnings}</p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 italic">
                      {scanResult.note || 'This information is extracted from the medicine package. Always verify with a healthcare professional before use.'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {scanResult && !scanResult.success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6 bg-red-50 border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold mb-1">Scan Failed</h3>
                    <p className="text-sm">{scanResult.error || 'Could not scan the medicine. Please try again with a clearer image.'}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}

