#!/usr/bin/env python3
"""
Quick test to verify the simple translation server works
"""

import requests
import time

def test_server():
    print("🧪 Testing Simple Translation Server...")
    print("=" * 50)
    
    # Test basic endpoint
    try:
        print("Testing basic endpoint...")
        response = requests.get("http://localhost:5000/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Basic endpoint works: {data}")
        else:
            print(f"❌ Basic endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("Make sure to run: python simple_translation_server.py")
        return False
    
    # Test health endpoint
    try:
        print("Testing health endpoint...")
        response = requests.get("http://localhost:5000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health endpoint works: {data}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
    
    print("\n🎯 Server is ready for translation!")
    return True

if __name__ == "__main__":
    test_server()
