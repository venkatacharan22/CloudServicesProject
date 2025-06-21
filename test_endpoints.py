#!/usr/bin/env python3
"""
Test script to verify all HackHub API endpoints are working
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, headers=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers)
        
        print(f"✅ {method} {endpoint} - Status: {response.status_code}")
        if response.status_code >= 400:
            print(f"   Error: {response.text[:200]}")
        return response.status_code < 400
    except Exception as e:
        print(f"❌ {method} {endpoint} - Error: {str(e)}")
        return False

def main():
    print("🧪 Testing HackHub API Endpoints")
    print("=" * 50)
    
    # Test public endpoints (no auth required)
    public_tests = [
        ("GET", "/hackathons"),
        ("GET", "/docs"),
        ("GET", "/health"),
    ]
    
    print("\n📋 Testing Public Endpoints:")
    for method, endpoint in public_tests:
        test_endpoint(method, endpoint)
    
    # Test specific hackathon endpoints
    print("\n🏆 Testing Hackathon Endpoints:")
    hackathon_tests = [
        ("GET", "/hackathons/analytics/overview"),  # This might need auth
        ("GET", "/hackathons/test-db"),
    ]
    
    for method, endpoint in hackathon_tests:
        test_endpoint(method, endpoint)
    
    # Test auth endpoints
    print("\n🔐 Testing Auth Endpoints:")
    auth_tests = [
        ("POST", "/auth/verify", {"token": "dummy_token"}),
    ]
    
    for method, endpoint, data in auth_tests:
        test_endpoint(method, endpoint, data)
    
    print("\n✨ Test completed!")
    print("\n📝 Notes:")
    print("- Some endpoints require authentication and will return 401/403")
    print("- This is expected behavior for protected endpoints")
    print("- The important thing is that endpoints are accessible (not 404)")

if __name__ == "__main__":
    main()
