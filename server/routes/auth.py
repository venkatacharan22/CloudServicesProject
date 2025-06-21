from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from services.firebase_service import firebase_service
from services.email_service import EmailService
from datetime import datetime

router = APIRouter()

# Initialize email service
email_service = EmailService()

class TokenVerificationRequest(BaseModel):
    token: str

class UserRegistrationRequest(BaseModel):
    email: EmailStr
    name: str
    role: str = "participant"  # participant or organizer
    organization: Optional[str] = None
    bio: Optional[str] = None

class TokenResponse(BaseModel):
    valid: bool
    user: Optional[dict] = None
    message: str

@router.post("/verify", response_model=TokenResponse)
async def verify_token(request: TokenVerificationRequest):
    """Verify Firebase ID token"""
    try:
        user_info = await firebase_service.verify_token(request.token)
        
        # Get user profile from Firestore
        profile = await firebase_service.get_user_profile(user_info['uid'])
        
        if profile:
            user_info.update(profile)
        
        return TokenResponse(
            valid=True,
            user=user_info,
            message="Token verified successfully"
        )
    except Exception as e:
        return TokenResponse(
            valid=False,
            message=str(e)
        )

@router.post("/register")
async def register_user(request: UserRegistrationRequest):
    """Register a new user profile in Firestore"""
    try:
        # This endpoint is called after Firebase Auth registration
        # to create the user profile in Firestore
        
        profile_data = {
            "email": request.email,
            "name": request.name,
            "role": request.role,
            "organization": request.organization,
            "bio": request.bio,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "is_active": True,
            "hackathons_participated": [],
            "hackathons_organized": [],
            "teams_joined": [],
        }
        
        # Note: In a real implementation, you'd get the UID from the verified token
        # For now, this is a placeholder that would be called from the frontend
        # after successful Firebase Auth registration
        
        return {
            "message": "User registration data prepared",
            "profile": profile_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/logout")
async def logout():
    """Logout endpoint (mainly for logging purposes)"""
    # Firebase handles token invalidation on the client side
    # This endpoint can be used for server-side logging or cleanup
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(firebase_service.verify_token)):
    """Get current user information"""
    try:
        # Get full profile from Firestore
        profile = await firebase_service.get_user_profile(current_user['uid'])
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Merge Firebase user info with profile
        user_info = {**current_user, **profile}
        
        return {
            "user": user_info,
            "message": "User information retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token():
    """Refresh token endpoint"""
    # Firebase handles token refresh on the client side
    # This endpoint can be used for additional server-side logic if needed
    return {"message": "Token refresh handled by Firebase client SDK"}

@router.post("/set-role")
async def set_user_role(
    uid: str, 
    role: str, 
    current_user: dict = Depends(firebase_service.verify_token)
):
    """Set custom role for a user (admin only)"""
    try:
        # Check if current user has admin privileges
        current_profile = await firebase_service.get_user_profile(current_user['uid'])
        if not current_profile or current_profile.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        # Set custom claims
        await firebase_service.set_custom_claims(uid, {'role': role})
        
        # Update profile in Firestore
        await firebase_service.update_user_profile(uid, {
            'role': role,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        return {"message": f"Role updated to {role} successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set role: {str(e)}"
        )
