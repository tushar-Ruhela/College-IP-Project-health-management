#!/usr/bin/env python3
"""
Simple test script for the translation service
"""

import requests
import json
import time

def test_translation_service():
    """Test if the translation service is working"""
    
    print("🧪 Testing Translation Service...")
    print("=" * 50)
    
    # Test service health
    try:
        response = requests.get("http://localhost:5000/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Translation service is running")
            print(f"   Status: {health_data['status']}")
            print(f"   Whisper loaded: {health_data['whisper_loaded']}")
            print(f"   Message: {health_data['message']}")
        else:
            print("❌ Translation service health check failed")
            return False
    except requests.exceptions.RequestException as e:
        print("❌ Cannot connect to translation service")
        print(f"   Error: {e}")
        print("   Make sure the service is running on http://localhost:5000")
        print("\n💡 To start the service:")
        print("   cd translation-service")
        print("   python simple_translation_server.py")
        return False
    
    print("\n🎯 Service is ready for translation!")
    print("\nTo test real-time translation:")
    print("1. Open the web application")
    print("2. Enable translation on the landing page")
    print("3. Join a video call")
    print("4. Use the translation tab to test speech translation")
    
    return True

if __name__ == "__main__":
    test_translation_service()
