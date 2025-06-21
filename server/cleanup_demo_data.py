#!/usr/bin/env python3
"""
Cleanup Demo Data for HackHub Platform
Removes demo accounts and sample hackathons
"""

import asyncio
import sys
import os

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.firebase_service import FirebaseService

# Demo hackathon IDs to remove
DEMO_HACKATHON_IDS = [
    "demo_hack_001",
    "demo_hack_002", 
    "demo_hack_003"
]

# Demo user IDs to remove
DEMO_USER_IDS = [
    "demo_student_001",
    "demo_organizer_001"
]

async def cleanup_demo_data():
    """Remove demo data from the database"""
    try:
        print("🧹 Starting demo data cleanup...")
        
        # Initialize Firebase service
        firebase_service = FirebaseService()
        
        # Remove demo hackathons
        print("🏆 Removing demo hackathons...")
        for hackathon_id in DEMO_HACKATHON_IDS:
            try:
                await firebase_service.delete_document('hackathons', hackathon_id)
                print(f"✅ Removed hackathon: {hackathon_id}")
            except Exception as e:
                print(f"⚠️ Hackathon {hackathon_id} might not exist: {str(e)}")
        
        # Remove demo users
        print("👥 Removing demo users...")
        for user_id in DEMO_USER_IDS:
            try:
                await firebase_service.delete_document('users', user_id)
                print(f"✅ Removed user: {user_id}")
            except Exception as e:
                print(f"⚠️ User {user_id} might not exist: {str(e)}")
        
        # Remove any registrations for demo hackathons
        print("📋 Cleaning up demo registrations...")
        for hackathon_id in DEMO_HACKATHON_IDS:
            for user_id in DEMO_USER_IDS:
                registration_id = f"{hackathon_id}_{user_id}"
                try:
                    await firebase_service.delete_document('registrations', registration_id)
                    print(f"✅ Removed registration: {registration_id}")
                except Exception as e:
                    print(f"⚠️ Registration {registration_id} might not exist: {str(e)}")
        
        print("\n🎉 Demo data cleanup completed!")
        print("✨ Your database is now clean and ready for real data!")
        
    except Exception as e:
        print(f"❌ Error cleaning demo data: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(cleanup_demo_data())
