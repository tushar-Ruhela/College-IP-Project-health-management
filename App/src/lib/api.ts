import { Capacitor } from '@capacitor/core';

/**
 * Get the API base URL for the backend server
 * The backend is now a separate Express server
 */
export function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use that
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL;
  if (apiBaseUrl) {
    console.log('Using backend server URL:', apiBaseUrl);
    return (apiBaseUrl as string).replace(/\/$/, '');
  }

  // Default backend server URL (change this to your deployed backend URL)
  // For local development, use http://localhost:3001
  // For production, use your deployed backend URL (e.g., https://your-backend.onrender.com)
  const defaultBackendUrl = process.env.NODE_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-backend.onrender.com') // Update this with your Render backend URL
    : 'http://localhost:3001';
  
  console.log('Using default backend URL:', defaultBackendUrl);
  return defaultBackendUrl;
}

/**
 * Make an API call with proper URL handling
 */
export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const baseUrl = getApiBaseUrl();
    // Ensure endpoint starts with / if baseUrl is provided
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = baseUrl ? `${baseUrl}${normalizedEndpoint}` : normalizedEndpoint;
    
    console.log('API Call:', url);
    console.log('Platform:', Capacitor.isNativePlatform() ? 'Native' : 'Web');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    return response;
  } catch (error) {
    console.error('Fetch error details:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const baseUrl = getApiBaseUrl();
      const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
      console.error('Failed to fetch from:', url);
      console.error('This could be due to:');
      console.error('1. CORS issues (check server CORS settings)');
      console.error('2. Network connectivity');
      console.error('3. SSL/TLS certificate issues');
      console.error('4. Server not responding');
    }
    throw error;
  }
}

