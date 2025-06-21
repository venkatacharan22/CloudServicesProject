from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from services.firebase_service import firebase_service
from datetime import datetime

router = APIRouter()
security = HTTPBearer()

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    organization: Optional[str] = None
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None

class UserResponse(BaseModel):
    uid: str
    email: str
    name: str
    role: str
    bio: Optional[str] = None
    organization: Optional[str] = None
    skills: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    created_at: str
    updated_at: str

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        print(f"🔐 Users: Verifying token: {token[:20]}...")

        # Use Firebase service to verify token with timeout
        import asyncio
        user = await asyncio.wait_for(
            firebase_service.verify_token(token),
            timeout=5.0  # 5 second timeout
        )
        print(f"✅ Users: Token verified for user: {user.get('uid')}")
        return user
    except asyncio.TimeoutError:
        print("❌ Users: Authentication timeout")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Authentication timeout",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"❌ Users: Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    try:
        profile = await firebase_service.get_user_profile(current_user['uid'])
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )

@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    updates: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    try:
        # Prepare update data
        update_data = {
            **updates.dict(exclude_unset=True),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Update profile in Firestore
        updated_profile = await firebase_service.update_user_profile(
            current_user['uid'], 
            update_data
        )
        
        return updated_profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    limit: Optional[int] = 50,
    current_user: dict = Depends(get_current_user)
):
    """List users (with optional role filter)"""
    try:
        filters = []
        if role:
            filters.append(('role', '==', role))
        
        users = await firebase_service.query_collection(
            'users',
            filters=filters,
            order_by='created_at',
            limit=limit
        )
        
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user profile by ID"""
    try:
        profile = await firebase_service.get_user_profile(user_id)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user: {str(e)}"
        )

@router.get("/registrations")
async def get_user_registrations(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's hackathon registrations"""
    try:
        # Query registrations collection for current user
        filters = [('user_id', '==', current_user['uid'])]
        registrations = await firebase_service.query_collection(
            'registrations',
            filters=filters,
            order_by='registration_date'
        )

        # Enrich registrations with hackathon data
        enriched_registrations = []
        for registration in registrations:
            hackathon_id = registration.get('hackathon_id')
            if hackathon_id:
                hackathon = await firebase_service.get_document('hackathons', hackathon_id)
                if hackathon:
                    registration['hackathon'] = hackathon
            enriched_registrations.append(registration)

        return {
            "registrations": enriched_registrations,
            "total": len(enriched_registrations)
        }
    except Exception as e:
        print(f"Error getting user registrations: {str(e)}")
        return {
            "registrations": [],
            "total": 0
        }

@router.post("/favorites/{hackathon_id}")
async def add_favorite(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add hackathon to user's favorites"""
    try:
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        favorites = profile.get('favorite_hackathons', [])
        if hackathon_id not in favorites:
            favorites.append(hackathon_id)
            await firebase_service.update_user_profile(
                current_user['uid'],
                {'favorite_hackathons': favorites}
            )

        return {"message": "Added to favorites", "success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add favorite: {str(e)}"
        )

@router.delete("/favorites/{hackathon_id}")
async def remove_favorite(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove hackathon from user's favorites"""
    try:
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        favorites = profile.get('favorite_hackathons', [])
        if hackathon_id in favorites:
            favorites.remove(hackathon_id)
            await firebase_service.update_user_profile(
                current_user['uid'],
                {'favorite_hackathons': favorites}
            )

        return {"message": "Removed from favorites", "success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite: {str(e)}"
        )

@router.get("/favorites")
async def get_user_favorites(
    current_user: dict = Depends(get_current_user)
):
    """Get user's favorite hackathons"""
    try:
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if not profile:
            return {"favorites": []}

        favorite_ids = profile.get('favorite_hackathons', [])
        favorites = []

        # Get hackathon details for each favorite
        for hackathon_id in favorite_ids:
            hackathon = await firebase_service.get_document('hackathons', hackathon_id)
            if hackathon:
                favorites.append(hackathon)

        return {"favorites": favorites}
    except Exception as e:
        print(f"Error getting user favorites: {str(e)}")
        return {"favorites": []}

@router.get("/stats")
async def get_user_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get user statistics"""
    try:
        # Get user registrations
        filters = [('user_id', '==', current_user['uid'])]
        registrations = await firebase_service.query_collection(
            'registrations',
            filters=filters
        )

        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])

        stats = {
            "total_registrations": len(registrations) if registrations else 0,
            "total_favorites": len(profile.get('favorite_hackathons', [])) if profile else 0,
            "hackathons_organized": len(profile.get('hackathons_organized', [])) if profile else 0,
            "member_since": profile.get('created_at') if profile else None
        }

        return stats
    except Exception as e:
        print(f"Error getting user stats: {str(e)}")
        return {
            "total_registrations": 0,
            "total_favorites": 0,
            "hackathons_organized": 0,
            "member_since": None
        }

@router.delete("/profile")
async def delete_user_profile(current_user: dict = Depends(get_current_user)):
    """Delete current user's profile"""
    try:
        await firebase_service.delete_document('users', current_user['uid'])
        
        return {"message": "Profile deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete profile: {str(e)}"
        )

@router.get("/registrations")
async def get_user_registrations(current_user: dict = Depends(get_current_user)):
    """Get current user's hackathon registrations"""
    try:
        print(f"Getting registrations for user: {current_user['uid']}")

        # Get all registrations for this user from the registrations collection
        registrations_collection = firebase_service.db.collection('registrations')
        query = registrations_collection.where('user_id', '==', current_user['uid'])
        registration_docs = query.stream()

        registrations = []
        for doc in registration_docs:
            registration_data = doc.to_dict()
            registration_data['id'] = doc.id

            # Get the hackathon details for each registration
            hackathon_id = registration_data.get('hackathon_id')
            if hackathon_id:
                hackathon = await firebase_service.get_document('hackathons', hackathon_id)
                if hackathon:
                    registration_data['hackathon'] = hackathon
                    registration_data['hackathon_title'] = hackathon.get('title', 'Unknown Hackathon')
                    registration_data['registered_at'] = registration_data.get('registration_date')
                    registrations.append(registration_data)

        print(f"Found {len(registrations)} registrations with hackathon details")
        return {"registrations": registrations}
    except Exception as e:
        print(f"Error in get_user_registrations: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of error to prevent UI breaking
        return {"registrations": []}

@router.get("/stats/overview")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user statistics overview"""
    try:
        profile = await firebase_service.get_user_profile(current_user['uid'])

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        stats = {
            "hackathons_participated": len(profile.get('hackathons_participated', [])),
            "hackathons_organized": len(profile.get('hackathons_organized', [])),
            "teams_joined": len(profile.get('teams_joined', [])),
            "profile_completion": calculate_profile_completion(profile)
        }

        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user stats: {str(e)}"
        )

@router.post("/favorites/{hackathon_id}")
async def add_favorite(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add hackathon to user's favorites"""
    try:
        profile = await firebase_service.get_user_profile(current_user['uid'])

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        favorites = profile.get('favorite_hackathons', [])
        if hackathon_id not in favorites:
            favorites.append(hackathon_id)
            await firebase_service.update_user_profile(current_user['uid'], {
                'favorite_hackathons': favorites
            })

        return {"message": "Added to favorites", "favorites": favorites}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add favorite: {str(e)}"
        )

@router.delete("/favorites/{hackathon_id}")
async def remove_favorite(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove hackathon from user's favorites"""
    try:
        profile = await firebase_service.get_user_profile(current_user['uid'])

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        favorites = profile.get('favorite_hackathons', [])
        if hackathon_id in favorites:
            favorites.remove(hackathon_id)
            await firebase_service.update_user_profile(current_user['uid'], {
                'favorite_hackathons': favorites
            })

        return {"message": "Removed from favorites", "favorites": favorites}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove favorite: {str(e)}"
        )

@router.get("/favorites")
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get user's favorite hackathons"""
    try:
        print(f"Getting favorites for user: {current_user['uid']}")
        profile = await firebase_service.get_user_profile(current_user['uid'])

        if not profile:
            print(f"User profile not found, creating empty favorites response")
            return {"favorites": []}

        favorite_ids = profile.get('favorite_hackathons', [])
        favorites = []

        # Get detailed hackathon info for each favorite
        for hackathon_id in favorite_ids:
            hackathon = await firebase_service.get_document('hackathons', hackathon_id)
            if hackathon:
                hackathon['id'] = hackathon_id
                favorites.append(hackathon)

        return {"favorites": favorites}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorites: {str(e)}"
        )

@router.get("/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user statistics and achievements"""
    try:
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        # Get user registrations
        registrations = await firebase_service.query_collection(
            'registrations',
            filters=[('user_id', '==', current_user['uid'])],
            order_by='registration_date'
        )

        # Calculate statistics
        total_hackathons = len(registrations)
        completed_hackathons = 0
        ongoing_hackathons = 0
        upcoming_hackathons = 0

        current_date = datetime.utcnow()

        for registration in registrations:
            hackathon = await firebase_service.get_document('hackathons', registration['hackathon_id'])
            if hackathon:
                end_date = datetime.fromisoformat(hackathon['end_date'].replace('Z', '+00:00'))
                start_date = datetime.fromisoformat(hackathon['start_date'].replace('Z', '+00:00'))

                if end_date < current_date:
                    completed_hackathons += 1
                elif start_date <= current_date <= end_date:
                    ongoing_hackathons += 1
                else:
                    upcoming_hackathons += 1

        # Calculate profile completion
        profile_fields = ['name', 'bio', 'organization', 'skills', 'github_url', 'linkedin_url']
        completed_fields = sum(1 for field in profile_fields if profile.get(field))
        profile_completion = (completed_fields / len(profile_fields)) * 100

        # Generate achievements
        achievements = []

        if total_hackathons >= 1:
            achievements.append({
                "id": "first_hackathon",
                "title": "First Steps",
                "description": "Registered for your first hackathon",
                "icon": "🎯",
                "earned_date": registrations[0]['registration_date'] if registrations else None
            })

        if total_hackathons >= 5:
            achievements.append({
                "id": "hackathon_enthusiast",
                "title": "Hackathon Enthusiast",
                "description": "Registered for 5+ hackathons",
                "icon": "🚀",
                "earned_date": registrations[4]['registration_date'] if len(registrations) >= 5 else None
            })

        if completed_hackathons >= 3:
            achievements.append({
                "id": "dedicated_participant",
                "title": "Dedicated Participant",
                "description": "Completed 3+ hackathons",
                "icon": "🏆",
                "earned_date": None  # Would need completion tracking
            })

        if profile_completion >= 80:
            achievements.append({
                "id": "profile_master",
                "title": "Profile Master",
                "description": "Completed 80%+ of profile information",
                "icon": "⭐",
                "earned_date": profile.get('updated_at')
            })

        return {
            "stats": {
                "total_hackathons": total_hackathons,
                "completed_hackathons": completed_hackathons,
                "ongoing_hackathons": ongoing_hackathons,
                "upcoming_hackathons": upcoming_hackathons,
                "profile_completion": round(profile_completion, 1),
                "favorite_count": len(profile.get('favorite_hackathons', []))
            },
            "achievements": achievements,
            "recent_registrations": registrations[-3:] if registrations else []
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user stats: {str(e)}"
        )

        favorite_ids = profile.get('favorite_hackathons', [])
        print(f"Found {len(favorite_ids)} favorite hackathons")
        favorites = []

        for hackathon_id in favorite_ids:
            try:
                hackathon = await firebase_service.get_document('hackathons', hackathon_id)
                if hackathon:
                    favorites.append(hackathon)
            except Exception as e:
                print(f"Error fetching favorite hackathon {hackathon_id}: {str(e)}")
                continue

        print(f"Returning {len(favorites)} favorites")
        return {"favorites": favorites}
    except Exception as e:
        print(f"Error in get_favorites: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of error to prevent UI breaking
        return {"favorites": []}

# API Compatibility Routes
@router.get("/my-registrations")
async def api_get_my_registrations(current_user: dict = Depends(get_current_user)):
    """API compatibility route for getting user registrations"""
    return await get_user_registrations(current_user)



def calculate_profile_completion(profile: dict) -> int:
    """Calculate profile completion percentage"""
    required_fields = ['name', 'email', 'bio', 'skills']
    optional_fields = ['organization', 'github_url', 'linkedin_url']
    
    completed_required = sum(1 for field in required_fields if profile.get(field))
    completed_optional = sum(1 for field in optional_fields if profile.get(field))
    
    total_fields = len(required_fields) + len(optional_fields)
    completed_fields = completed_required + completed_optional
    
    # Required fields are weighted more heavily
    score = (completed_required / len(required_fields)) * 70 + (completed_optional / len(optional_fields)) * 30
    
    return min(100, int(score))
