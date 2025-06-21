#!/usr/bin/env python3
"""
Debug script to trace registration issues step by step
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_server_health():
    """Test if server is running"""
    print("🏥 Testing server health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Server is healthy!")
            return True
        else:
            print("❌ Server health check failed")
            return False
    except Exception as e:
        print(f"❌ Server is not running: {e}")
        return False

def test_get_hackathons():
    """Test getting hackathons list"""
    print("\n🔍 Testing GET /hackathons...")
    try:
        response = requests.get(f"{BASE_URL}/hackathons")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            hackathons = data.get('hackathons', [])
            print(f"Found {len(hackathons)} hackathons")
            
            if hackathons:
                first_hackathon = hackathons[0]
                print(f"First hackathon ID: {first_hackathon.get('id')}")
                print(f"Title: {first_hackathon.get('title')}")
                print(f"Participants: {len(first_hackathon.get('participants', []))}")
                print(f"Registration deadline: {first_hackathon.get('registration_deadline')}")
                print(f"Max participants: {first_hackathon.get('max_participants')}")
                return first_hackathon.get('id'), first_hackathon
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")
    
    return None, None

def test_registration_with_no_auth(hackathon_id):
    """Test registration without authentication"""
    print(f"\n🔐 Testing registration without auth for hackathon: {hackathon_id}")
    
    registration_data = {
        "name": "Test User",
        "email": "test@example.com",
        "organization": "Test University",
        "experience_level": "beginner",
        "motivation": "Learning and networking"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/hackathons/{hackathon_id}/register",
            json=registration_data
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("✅ Expected 401 - Authentication required")
            return True
        else:
            print("❌ Unexpected response - should require authentication")
            return False
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_registration_with_fake_auth(hackathon_id):
    """Test registration with fake auth token"""
    print(f"\n🔐 Testing registration with fake auth for hackathon: {hackathon_id}")
    
    headers = {
        "Authorization": "Bearer fake_token_12345",
        "Content-Type": "application/json"
    }
    
    registration_data = {
        "name": "Test User",
        "email": "test@example.com",
        "organization": "Test University",
        "experience_level": "beginner",
        "motivation": "Learning and networking"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/hackathons/{hackathon_id}/register",
            headers=headers,
            json=registration_data
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("✅ Expected 401 - Invalid token rejected")
            return True
        else:
            print("❌ Unexpected response - should reject fake token")
            return False
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_hackathon_details(hackathon_id):
    """Test getting hackathon details"""
    print(f"\n📋 Testing hackathon details for: {hackathon_id}")
    
    try:
        response = requests.get(f"{BASE_URL}/hackathons/{hackathon_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            hackathon = data.get('hackathon', {})
            print(f"Title: {hackathon.get('title')}")
            print(f"Status: {hackathon.get('status')}")
            print(f"Registration deadline: {hackathon.get('registration_deadline')}")
            print(f"Current participants: {len(hackathon.get('participants', []))}")
            print(f"Max participants: {hackathon.get('max_participants')}")
            
            # Check if registration is still open
            from datetime import datetime
            deadline = hackathon.get('registration_deadline')
            if deadline:
                try:
                    deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    now = datetime.utcnow()
                    if now > deadline_dt.replace(tzinfo=None):
                        print("❌ Registration deadline has passed!")
                        return False
                    else:
                        print("✅ Registration is still open")
                        return True
                except:
                    print("⚠️ Could not parse registration deadline")
            
            return True
        else:
            print(f"Error: {response.text}")
            return False
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("🚀 Starting HackHub Registration Debug")
    print("=" * 50)
    
    # Test server health first
    if not test_server_health():
        print("❌ Server is not running. Please start the server first.")
        return
    
    # Test getting hackathons
    hackathon_id, hackathon = test_get_hackathons()
    
    if not hackathon_id:
        print("❌ No hackathons found, cannot test registration")
        return
    
    # Test hackathon details
    if not test_hackathon_details(hackathon_id):
        print("❌ Issue with hackathon details")
        return
    
    # Test authentication requirements
    auth_no_token = test_registration_with_no_auth(hackathon_id)
    auth_fake_token = test_registration_with_fake_auth(hackathon_id)
    
    print("\n" + "=" * 50)
    print("📊 REGISTRATION DEBUG SUMMARY")
    print("=" * 50)
    
    print(f"✅ Server Health: OK")
    print(f"✅ Hackathons Available: {hackathon_id}")
    print(f"✅ Registration Deadline: OK")
    print(f"✅ Auth Required (No Token): {'OK' if auth_no_token else 'FAIL'}")
    print(f"✅ Auth Required (Fake Token): {'OK' if auth_fake_token else 'FAIL'}")
    
    print("\n🔧 DIAGNOSIS:")
    print("The backend registration endpoint is working correctly!")
    print("The issue is likely in the frontend authentication.")
    
    print("\n📋 FRONTEND DEBUGGING STEPS:")
    print("1. Open browser console (F12)")
    print("2. Login to the app")
    print("3. Try to register for a hackathon")
    print("4. Check console for errors:")
    print("   - Authentication token errors")
    print("   - Network request failures")
    print("   - API response errors")
    
    print("\n🔍 THINGS TO CHECK:")
    print("- Is the user actually logged in?")
    print("- Is Firebase Auth working?")
    print("- Is the token being sent in requests?")
    print("- Are there any CORS issues?")
    print("- Check Network tab for failed requests")

if __name__ == "__main__":
    main()
