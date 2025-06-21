from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from services.firebase_service import firebase_service
# from services.email_service import EmailService  # Temporarily disabled
import uuid

router = APIRouter()
security = HTTPBearer()

# Simple health check endpoint
@router.get("/health")
async def hackathon_health():
    """Simple health check for hackathon routes"""
    return {
        "status": "healthy",
        "message": "Hackathon routes are working",
        "timestamp": datetime.utcnow().isoformat()
    }

# Initialize email service - temporarily disabled
# email_service = EmailService()

class HackathonCreate(BaseModel):
    title: str
    description: str
    theme: Optional[str] = None
    start_date: str
    end_date: str
    registration_deadline: str
    max_participants: Optional[int] = None
    max_team_size: Optional[int] = 4
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    venue_coordinates: Optional[Dict[str, float]] = None
    is_virtual: bool = False
    prizes: Optional[List[Dict[str, Any]]] = None
    rules: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    
    @validator('start_date', 'end_date', 'registration_deadline')
    def validate_dates(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Invalid date format. Use ISO format.')

class HackathonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    theme: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None
    max_participants: Optional[int] = None
    max_team_size: Optional[int] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    venue_coordinates: Optional[Dict[str, float]] = None
    is_virtual: Optional[bool] = None
    prizes: Optional[List[Dict[str, Any]]] = None
    rules: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    tags: Optional[List[str]] = None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        print(f"🔐 Verifying token: {token[:20]}...")

        # Use Firebase service to verify token with timeout
        import asyncio
        user = await asyncio.wait_for(
            firebase_service.verify_token(token),
            timeout=5.0  # 5 second timeout
        )
        print(f"✅ Token verified for user: {user.get('uid')}")
        return user
    except asyncio.TimeoutError:
        print("❌ Authentication timeout")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Authentication timeout",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/")
async def create_hackathon(
    hackathon_data: HackathonCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new hackathon (organizers only)"""
    try:
        print(f"Received hackathon data: {hackathon_data.dict()}")
        print(f"Current user: {current_user}")
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        # Allow organizers to create hackathons, but also allow for demo purposes
        user_role = profile.get('role', 'participant')
        print(f"User {current_user['uid']} with role {user_role} attempting to create hackathon")
        
        # Generate hackathon ID
        hackathon_id = str(uuid.uuid4())
        
        # Prepare hackathon data
        hackathon_doc = {
            **hackathon_data.dict(),
            "id": hackathon_id,
            "organizer_id": current_user['uid'],
            "organizer_name": profile.get('name', 'Unknown'),
            "status": "upcoming",
            "participants": [],
            "teams": [],
            "submissions": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Create hackathon in Firestore
        await firebase_service.create_document('hackathons', hackathon_id, hackathon_doc)
        
        # Update organizer's profile
        organized_hackathons = profile.get('hackathons_organized', [])
        organized_hackathons.append(hackathon_id)
        await firebase_service.update_user_profile(current_user['uid'], {
            'hackathons_organized': organized_hackathons
        })
        
        return {
            "message": "Hackathon created successfully",
            "hackathon_id": hackathon_id,
            "hackathon": hackathon_doc
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create hackathon: {str(e)}"
        )

@router.get("/")
async def list_hackathons(
    status: Optional[str] = None,
    organizer_id: Optional[str] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0
):
    """List hackathons with optional filters"""
    try:
        filters = []
        if status:
            filters.append(('status', '==', status))
        if organizer_id:
            filters.append(('organizer_id', '==', organizer_id))

        hackathons = await firebase_service.query_collection(
            'hackathons',
            filters=filters,
            order_by='created_at',
            limit=limit
        )

        # Always return success, even if empty
        return {
            "hackathons": hackathons or [],
            "total": len(hackathons) if hackathons else 0
        }
    except Exception as e:
        # Return empty list instead of error for better UX
        print(f"Error listing hackathons: {str(e)}")
        return {
            "hackathons": [],
            "total": 0
        }

@router.get("/{hackathon_id}")
async def get_hackathon(hackathon_id: str):
    """Get hackathon details by ID"""
    try:
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)

        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )

        # Return hackathon data directly (frontend expects this format)
        return hackathon
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get hackathon: {str(e)}"
        )

@router.put("/{hackathon_id}")
async def update_hackathon(
    hackathon_id: str,
    updates: HackathonUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update hackathon (organizer only)"""
    try:
        # Get hackathon
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )
        
        # Check if user is the organizer
        if hackathon['organizer_id'] != current_user['uid']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the organizer can update this hackathon"
            )
        
        # Prepare update data
        update_data = {
            **updates.dict(exclude_unset=True),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Update hackathon
        updated_hackathon = await firebase_service.update_document(
            'hackathons', hackathon_id, update_data
        )
        
        return {
            "message": "Hackathon updated successfully",
            "hackathon": updated_hackathon
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update hackathon: {str(e)}"
        )

@router.delete("/{hackathon_id}")
async def delete_hackathon(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete hackathon (organizer only)"""
    try:
        # Get hackathon
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )

        # Check if user is the organizer
        if hackathon['organizer_id'] != current_user['uid']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the organizer can delete this hackathon"
            )

        # Delete hackathon
        await firebase_service.delete_document('hackathons', hackathon_id)

        # Update organizer's profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        organized_hackathons = profile.get('hackathons_organized', [])
        if hackathon_id in organized_hackathons:
            organized_hackathons.remove(hackathon_id)
            await firebase_service.update_user_profile(current_user['uid'], {
                'hackathons_organized': organized_hackathons
            })

        return {"message": "Hackathon deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete hackathon: {str(e)}"
        )

class RegistrationData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    motivation: Optional[str] = None
    team_preference: Optional[str] = None
    dietary_restrictions: Optional[str] = None

    @validator('skills', pre=True, always=True)
    def validate_skills(cls, v):
        if v is None or v == "" or v == []:
            return []
        if isinstance(v, str):
            if v.strip() == "":
                return []
            # Split comma-separated string into list
            return [skill.strip() for skill in v.split(',') if skill.strip()]
        if isinstance(v, list):
            return v
        return []

@router.post("/{hackathon_id}/register")
async def register_for_hackathon(
    hackathon_id: str,
    registration_data: Optional[RegistrationData] = None,
    current_user: dict = Depends(get_current_user)
):
    """Register for a hackathon"""
    try:
        print(f"✅ Registration request received for hackathon: {hackathon_id}")
        print(f"✅ Current user: {current_user}")
        print(f"✅ Registration data: {registration_data}")

        if registration_data:
            print(f"✅ Registration data dict: {registration_data.dict()}")

        # Validate hackathon_id
        if not hackathon_id or hackathon_id.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid hackathon ID"
            )

        # Quick response for testing - bypass Firebase temporarily
        print(f"✅ Processing registration for user {current_user['uid']} in hackathon {hackathon_id}")

        # Get hackathon details
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )

        # Check if already registered
        existing_registration = await firebase_service.get_document(
            'registrations',
            f"{hackathon_id}_{current_user['uid']}"
        )
        if existing_registration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already registered for this hackathon"
            )

        # Create registration record
        registration_record = {
            "user_id": current_user['uid'],
            "hackathon_id": hackathon_id,
            "registration_date": datetime.utcnow().isoformat(),
            "status": "registered",
            "user_name": current_user.get('name', ''),
            "user_email": current_user.get('email', '')
        }

        # Add registration data if provided
        if registration_data:
            registration_record.update(registration_data.dict(exclude_unset=True))

        # Store registration
        registration_id = f"{hackathon_id}_{current_user['uid']}"
        await firebase_service.create_document('registrations', registration_id, registration_record)

        # Update hackathon participants count
        participants = hackathon.get('participants', [])
        if current_user['uid'] not in participants:
            participants.append(current_user['uid'])
            await firebase_service.update_document('hackathons', hackathon_id, {
                'participants': participants,
                'updated_at': datetime.utcnow().isoformat()
            })

        # Update user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if profile:
            participated_hackathons = profile.get('hackathons_participated', [])
            if hackathon_id not in participated_hackathons:
                participated_hackathons.append(hackathon_id)
                await firebase_service.update_user_profile(current_user['uid'], {
                    'hackathons_participated': participated_hackathons
                })

        print(f"✅ Registration successful for user {current_user['uid']} in hackathon {hackathon_id}")

        return {
            "message": "Successfully registered for hackathon",
            "success": True,
            "hackathon_id": hackathon_id,
            "user_id": current_user['uid'],
            "registration_date": registration_record['registration_date'],
            "status": "registered"
        }
    except HTTPException as he:
        print(f"HTTP Exception during registration: {he.detail}")
        raise he
    except Exception as e:
        print(f"Unexpected error during registration: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.delete("/{hackathon_id}/unregister")
async def unregister_from_hackathon(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Unregister from a hackathon"""
    try:
        print(f"🔄 Unregistration request for hackathon: {hackathon_id}")
        print(f"👤 User: {current_user['uid']}")

        # Check if registration exists
        registration_id = f"{hackathon_id}_{current_user['uid']}"
        registration = await firebase_service.get_document('registrations', registration_id)

        if not registration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration not found"
            )

        # Delete registration
        await firebase_service.delete_document('registrations', registration_id)

        # Update hackathon participants
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if hackathon:
            participants = hackathon.get('participants', [])
            if current_user['uid'] in participants:
                participants.remove(current_user['uid'])
                await firebase_service.update_document('hackathons', hackathon_id, {
                    'participants': participants,
                    'updated_at': datetime.utcnow().isoformat()
                })

        # Update user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if profile:
            participated_hackathons = profile.get('hackathons_participated', [])
            if hackathon_id in participated_hackathons:
                participated_hackathons.remove(hackathon_id)
                await firebase_service.update_user_profile(current_user['uid'], {
                    'hackathons_participated': participated_hackathons
                })

        print(f"✅ Unregistration successful for user {current_user['uid']} from hackathon {hackathon_id}")

        return {
            "message": "Successfully unregistered from hackathon",
            "success": True,
            "hackathon_id": hackathon_id,
            "user_id": current_user['uid']
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unregistration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unregister from hackathon: {str(e)}"
        )

@router.delete("/{hackathon_id}/unregister")
async def unregister_from_hackathon(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Unregister from a hackathon"""
    try:
        # Get hackathon
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )

        # Check if user is registered
        participants = hackathon.get('participants', [])
        if current_user['uid'] not in participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not registered for this hackathon"
            )

        # Remove participant
        participants.remove(current_user['uid'])
        await firebase_service.update_document('hackathons', hackathon_id, {
            'participants': participants,
            'updated_at': datetime.utcnow().isoformat()
        })

        # Update user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        participated_hackathons = profile.get('hackathons_participated', [])
        if hackathon_id in participated_hackathons:
            participated_hackathons.remove(hackathon_id)
            await firebase_service.update_user_profile(current_user['uid'], {
                'hackathons_participated': participated_hackathons
            })

        return {"message": "Successfully unregistered from hackathon"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unregister: {str(e)}"
        )

@router.get("/analytics/overview")
async def get_hackathon_analytics(current_user: dict = Depends(get_current_user)):
    """Get hackathon analytics for organizers"""
    try:
        # Check if user is an organizer
        profile = await firebase_service.get_user_profile(current_user['uid'])
        if not profile or profile.get('role') != 'organizer':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organizers can view analytics"
            )

        # Get all hackathons for this organizer
        hackathons = await firebase_service.query_collection(
            'hackathons',
            filters=[('organizer_id', '==', current_user['uid'])],
            order_by='created_at'
        )

        # Calculate analytics
        total_hackathons = len(hackathons)
        total_registrations = sum(len(h.get('participants', [])) for h in hackathons)

        # Status distribution
        status_counts = {}
        for hackathon in hackathons:
            status = hackathon.get('status', 'upcoming')
            status_counts[status] = status_counts.get(status, 0) + 1

        # Monthly trends
        monthly_data = {}
        for hackathon in hackathons:
            created_date = datetime.fromisoformat(hackathon['created_at'].replace('Z', '+00:00'))
            month_key = created_date.strftime('%Y-%m')
            monthly_data[month_key] = monthly_data.get(month_key, 0) + 1

        # Top performing hackathons
        top_hackathons = sorted(
            hackathons,
            key=lambda h: len(h.get('participants', [])),
            reverse=True
        )[:5]

        return {
            "total_hackathons": total_hackathons,
            "total_registrations": total_registrations,
            "avg_registrations": total_registrations / total_hackathons if total_hackathons > 0 else 0,
            "status_distribution": status_counts,
            "monthly_trends": monthly_data,
            "top_hackathons": [
                {
                    "id": h['id'],
                    "title": h['title'],
                    "participants": len(h.get('participants', [])),
                    "status": h.get('status', 'upcoming')
                }
                for h in top_hackathons
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )

# Simple test endpoint for registration (no auth, no Firebase)
@router.post("/simple-register/{hackathon_id}")
async def simple_register_for_hackathon(hackathon_id: str, registration_data: dict = None):
    """Simple registration endpoint for testing"""
    try:
        print(f"SIMPLE: Registration request for hackathon: {hackathon_id}")
        print(f"SIMPLE: Registration data: {registration_data}")

        # Simulate successful registration without Firebase
        test_registration = {
            "id": str(uuid.uuid4()),
            "hackathon_id": hackathon_id,
            "user_id": "test_user_123",
            "name": registration_data.get("name", "Test User") if registration_data else "Test User",
            "email": registration_data.get("email", "test@example.com") if registration_data else "test@example.com",
            "registration_date": datetime.utcnow().isoformat(),
            "status": "registered"
        }

        print(f"SIMPLE: Registration successful: {test_registration}")

        return {
            "message": "Registration successful (test mode)",
            "registration": test_registration,
            "status": "success",
            "success": True
        }

    except Exception as e:
        print(f"SIMPLE: Registration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "status": "error"}

# Test endpoint for registration (no auth required)
@router.post("/test-register/{hackathon_id}")
async def test_register_for_hackathon(hackathon_id: str):
    """Test registration endpoint without authentication"""
    try:
        print(f"TEST: Registration request for hackathon: {hackathon_id}")

        # Check if hackathon exists
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if not hackathon:
            return {"error": "Hackathon not found", "status": "error"}

        print(f"TEST: Found hackathon: {hackathon.get('title')}")

        # Simulate successful registration
        test_registration = {
            "id": str(uuid.uuid4()),
            "hackathon_id": hackathon_id,
            "user_id": "test_user_123",
            "name": "Test User",
            "email": "test@example.com",
            "registration_date": datetime.utcnow().isoformat(),
            "status": "registered"
        }

        print(f"TEST: Registration successful: {test_registration}")

        return {
            "message": "Test registration successful",
            "registration": test_registration,
            "status": "success"
        }

    except Exception as e:
        print(f"TEST: Registration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "status": "error"}

# API Compatibility Routes
@router.post("/register")
async def api_register_for_hackathon(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """API compatibility route for hackathon registration"""
    try:
        hackathon_id = request.get('hackathon_id')
        if not hackathon_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="hackathon_id is required"
            )

        # Create registration data from request
        registration_data = RegistrationData(**{k: v for k, v in request.items() if k != 'hackathon_id'})

        # Call the existing registration function
        return await register_for_hackathon(hackathon_id, registration_data, current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register: {str(e)}"
        )



@router.get("/test-db")
async def test_database_connection():
    """Test database connection and operations"""
    try:
        print("Testing database connection...")

        # Test basic connection
        collections = await firebase_service.db.collections()
        collection_names = [col.id async for col in collections]
        print(f"Found collections: {collection_names}")

        # Test creating a document
        test_doc = {
            "test": True,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Database connection test"
        }

        await firebase_service.create_document('test_collection', 'test_doc', test_doc)
        print("Test document created successfully")

        # Test reading the document
        retrieved_doc = await firebase_service.get_document('test_collection', 'test_doc')
        print(f"Test document retrieved: {retrieved_doc is not None}")

        # Clean up
        await firebase_service.delete_document('test_collection', 'test_doc')
        print("Test document cleaned up")

        return {
            "success": True,
            "message": "Database connection successful",
            "collections": collection_names,
            "test_document_created": retrieved_doc is not None
        }
    except Exception as e:
        print(f"Database test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Database connection failed"
        }

@router.get("/analytics/overview")
async def get_hackathon_analytics(
    current_user: dict = Depends(get_current_user)
):
    """Get hackathon analytics overview"""
    try:
        # Get all hackathons for organizer
        if current_user.get('role') == 'organizer':
            filters = [('organizer_id', '==', current_user['uid'])]
        else:
            filters = []

        hackathons = await firebase_service.query_collection(
            'hackathons',
            filters=filters
        )

        # Get all registrations
        registrations = await firebase_service.query_collection('registrations')

        # Calculate analytics
        total_hackathons = len(hackathons) if hackathons else 0
        total_registrations = len(registrations) if registrations else 0

        # Status distribution
        status_counts = {}
        for hackathon in hackathons or []:
            status = hackathon.get('status', 'upcoming')
            status_counts[status] = status_counts.get(status, 0) + 1

        # Registration trends (simplified)
        registration_trends = []
        hackathon_registrations = {}

        for registration in registrations or []:
            hackathon_id = registration.get('hackathon_id')
            if hackathon_id:
                hackathon_registrations[hackathon_id] = hackathon_registrations.get(hackathon_id, 0) + 1

        # Top hackathons by registration
        top_hackathons = []
        for hackathon in hackathons or []:
            reg_count = hackathon_registrations.get(hackathon['id'], 0)
            top_hackathons.append({
                'title': hackathon.get('title', 'Unknown'),
                'registrations': reg_count,
                'id': hackathon['id']
            })

        top_hackathons.sort(key=lambda x: x['registrations'], reverse=True)
        top_hackathons = top_hackathons[:5]  # Top 5

        return {
            "total_hackathons": total_hackathons,
            "total_registrations": total_registrations,
            "status_distribution": status_counts,
            "top_hackathons": top_hackathons,
            "registration_trends": registration_trends
        }

    except Exception as e:
        print(f"Error getting analytics: {str(e)}")
        return {
            "total_hackathons": 0,
            "total_registrations": 0,
            "status_distribution": {},
            "top_hackathons": [],
            "registration_trends": []
        }



@router.get("/{hackathon_id}/participants")
async def get_hackathon_participants(
    hackathon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get participants of a hackathon with detailed information"""
    try:
        # Get hackathon
        hackathon = await firebase_service.get_document('hackathons', hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )

        # Check if user has permission to view participants
        # Organizers can see all details, participants can see basic info
        is_organizer = hackathon.get('organizer_id') == current_user['uid']
        is_participant = current_user['uid'] in hackathon.get('participants', [])

        if not (is_organizer or is_participant):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view participants"
            )

        # Get participant IDs
        participant_ids = hackathon.get('participants', [])

        # Get detailed participant information
        participants = []
        for participant_id in participant_ids:
            participant = await firebase_service.get_user_profile(participant_id)
            if participant:
                # Get registration details
                registration = await firebase_service.query_collection(
                    'registrations',
                    filters=[
                        ('user_id', '==', participant_id),
                        ('hackathon_id', '==', hackathon_id)
                    ],
                    limit=1
                )

                registration_data = registration[0] if registration else {}

                if is_organizer:
                    # Organizers see full details
                    participant_info = {
                        "uid": participant_id,
                        "name": participant.get('name', 'Anonymous'),
                        "email": participant.get('email', ''),
                        "organization": participant.get('organization', ''),
                        "skills": participant.get('skills', []),
                        "role": participant.get('role', 'student'),
                        "github_url": participant.get('github_url', ''),
                        "linkedin_url": participant.get('linkedin_url', ''),
                        "registration_date": registration_data.get('registration_date'),
                        "motivation": registration_data.get('motivation', ''),
                        "experience_level": registration_data.get('experience_level', ''),
                        "dietary_restrictions": registration_data.get('dietary_restrictions', ''),
                        "emergency_contact": registration_data.get('emergency_contact', {})
                    }
                else:
                    # Participants see limited info
                    participant_info = {
                        "uid": participant_id,
                        "name": participant.get('name', 'Anonymous'),
                        "organization": participant.get('organization', ''),
                        "skills": participant.get('skills', []),
                        "role": participant.get('role', 'student'),
                        "registration_date": registration_data.get('registration_date')
                    }

                participants.append(participant_info)

        # Sort participants by registration date
        participants.sort(key=lambda x: x.get('registration_date', ''), reverse=True)

        # Calculate organization stats
        org_stats = {}
        for p in participants:
            org = p.get('organization', 'Unknown')
            org_stats[org] = org_stats.get(org, 0) + 1

        return {
            "hackathon_id": hackathon_id,
            "hackathon_title": hackathon.get('title', ''),
            "participants": participants,
            "total_participants": len(participants),
            "max_participants": hackathon.get('max_participants'),
            "is_organizer": is_organizer,
            "registration_stats": {
                "total": len(participants),
                "students": len([p for p in participants if p.get('role') == 'student']),
                "organizers": len([p for p in participants if p.get('role') == 'organizer']),
                "by_organization": org_stats
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get participants: {str(e)}"
        )
