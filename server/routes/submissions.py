from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from services.firebase_service import firebase_service
import uuid

router = APIRouter()
security = HTTPBearer()

class SubmissionCreate(BaseModel):
    title: str
    description: str
    hackathon_id: str
    team_id: Optional[str] = None
    github_url: Optional[HttpUrl] = None
    demo_url: Optional[HttpUrl] = None
    video_url: Optional[HttpUrl] = None
    presentation_url: Optional[HttpUrl] = None
    technologies: Optional[List[str]] = None
    category: Optional[str] = None

class SubmissionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    github_url: Optional[HttpUrl] = None
    demo_url: Optional[HttpUrl] = None
    video_url: Optional[HttpUrl] = None
    presentation_url: Optional[HttpUrl] = None
    technologies: Optional[List[str]] = None
    category: Optional[str] = None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        user = await firebase_service.verify_token(token)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/")
async def create_submission(
    submission_data: SubmissionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new submission"""
    try:
        # Verify hackathon exists and user is registered
        hackathon = await firebase_service.get_document('hackathons', submission_data.hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )
        
        participants = hackathon.get('participants', [])
        if current_user['uid'] not in participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must be registered for hackathon to submit"
            )
        
        # Check submission deadline (hackathon end date)
        end_date = datetime.fromisoformat(hackathon['end_date'].replace('Z', '+00:00'))
        if datetime.utcnow() > end_date.replace(tzinfo=None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Submission deadline has passed"
            )
        
        # If team submission, verify team membership
        if submission_data.team_id:
            team = await firebase_service.get_document('teams', submission_data.team_id)
            if not team:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Team not found"
                )
            
            if current_user['uid'] not in team.get('members', []):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not a member of this team"
                )
        
        # Generate submission ID
        submission_id = str(uuid.uuid4())
        
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        
        # Prepare submission data
        submission_doc = {
            **submission_data.dict(),
            "id": submission_id,
            "submitter_id": current_user['uid'],
            "submitter_name": profile.get('name', 'Unknown'),
            "status": "submitted",
            "score": None,
            "feedback": None,
            "rank": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Create submission in Firestore
        await firebase_service.create_document('submissions', submission_id, submission_doc)
        
        return {
            "message": "Submission created successfully",
            "submission_id": submission_id,
            "submission": submission_doc
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create submission: {str(e)}"
        )

@router.get("/")
async def list_submissions(
    hackathon_id: Optional[str] = None,
    team_id: Optional[str] = None,
    submitter_id: Optional[str] = None,
    limit: Optional[int] = 20
):
    """List submissions with optional filters"""
    try:
        filters = []
        if hackathon_id:
            filters.append(('hackathon_id', '==', hackathon_id))
        if team_id:
            filters.append(('team_id', '==', team_id))
        if submitter_id:
            filters.append(('submitter_id', '==', submitter_id))
        
        submissions = await firebase_service.query_collection(
            'submissions',
            filters=filters,
            order_by='created_at',
            limit=limit
        )
        
        return {
            "submissions": submissions,
            "total": len(submissions)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list submissions: {str(e)}"
        )

@router.get("/{submission_id}")
async def get_submission(submission_id: str):
    """Get submission details by ID"""
    try:
        submission = await firebase_service.get_document('submissions', submission_id)
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        return submission
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get submission: {str(e)}"
        )

@router.put("/{submission_id}")
async def update_submission(
    submission_id: str,
    updates: SubmissionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update submission (submitter only)"""
    try:
        # Get submission
        submission = await firebase_service.get_document('submissions', submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check if user is the submitter or team member
        can_edit = False
        if submission['submitter_id'] == current_user['uid']:
            can_edit = True
        elif submission.get('team_id'):
            team = await firebase_service.get_document('teams', submission['team_id'])
            if team and current_user['uid'] in team.get('members', []):
                can_edit = True
        
        if not can_edit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this submission"
            )
        
        # Check if hackathon is still ongoing
        hackathon = await firebase_service.get_document('hackathons', submission['hackathon_id'])
        end_date = datetime.fromisoformat(hackathon['end_date'].replace('Z', '+00:00'))
        if datetime.utcnow() > end_date.replace(tzinfo=None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit submission after hackathon ends"
            )
        
        # Prepare update data
        update_data = {
            **updates.dict(exclude_unset=True),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Update submission
        updated_submission = await firebase_service.update_document(
            'submissions', submission_id, update_data
        )
        
        return {
            "message": "Submission updated successfully",
            "submission": updated_submission
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update submission: {str(e)}"
        )

@router.delete("/{submission_id}")
async def delete_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete submission (submitter only)"""
    try:
        # Get submission
        submission = await firebase_service.get_document('submissions', submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check if user is the submitter
        if submission['submitter_id'] != current_user['uid']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the submitter can delete this submission"
            )
        
        # Check if hackathon is still ongoing
        hackathon = await firebase_service.get_document('hackathons', submission['hackathon_id'])
        end_date = datetime.fromisoformat(hackathon['end_date'].replace('Z', '+00:00'))
        if datetime.utcnow() > end_date.replace(tzinfo=None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete submission after hackathon ends"
            )
        
        # Delete submission
        await firebase_service.delete_document('submissions', submission_id)
        
        return {"message": "Submission deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete submission: {str(e)}"
        )
