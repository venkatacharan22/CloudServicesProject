from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from services.firebase_service import firebase_service
import uuid

router = APIRouter()
security = HTTPBearer()

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    hackathon_id: str
    max_members: Optional[int] = 4
    skills_needed: Optional[List[str]] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_members: Optional[int] = None
    skills_needed: Optional[List[str]] = None

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
async def create_team(
    team_data: TeamCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new team"""
    try:
        # Verify hackathon exists and user is registered
        hackathon = await firebase_service.get_document('hackathons', team_data.hackathon_id)
        if not hackathon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hackathon not found"
            )
        
        participants = hackathon.get('participants', [])
        if current_user['uid'] not in participants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must be registered for hackathon to create a team"
            )
        
        # Generate team ID
        team_id = str(uuid.uuid4())
        
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        
        # Prepare team data
        team_doc = {
            **team_data.dict(),
            "id": team_id,
            "leader_id": current_user['uid'],
            "leader_name": profile.get('name', 'Unknown'),
            "members": [current_user['uid']],
            "member_details": [{
                "uid": current_user['uid'],
                "name": profile.get('name', 'Unknown'),
                "role": "leader",
                "joined_at": datetime.utcnow().isoformat()
            }],
            "status": "recruiting",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Create team in Firestore
        await firebase_service.create_document('teams', team_id, team_doc)
        
        # Update user profile
        teams_joined = profile.get('teams_joined', [])
        teams_joined.append(team_id)
        await firebase_service.update_user_profile(current_user['uid'], {
            'teams_joined': teams_joined
        })
        
        return {
            "message": "Team created successfully",
            "team_id": team_id,
            "team": team_doc
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team: {str(e)}"
        )

@router.get("/")
async def list_teams(
    hackathon_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = 20
):
    """List teams with optional filters"""
    try:
        filters = []
        if hackathon_id:
            filters.append(('hackathon_id', '==', hackathon_id))
        if status:
            filters.append(('status', '==', status))
        
        teams = await firebase_service.query_collection(
            'teams',
            filters=filters,
            order_by='created_at',
            limit=limit
        )
        
        return {
            "teams": teams,
            "total": len(teams)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list teams: {str(e)}"
        )

@router.get("/{team_id}")
async def get_team(team_id: str):
    """Get team details by ID"""
    try:
        team = await firebase_service.get_document('teams', team_id)
        
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        return team
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team: {str(e)}"
        )

@router.post("/{team_id}/join")
async def join_team(
    team_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Join a team"""
    try:
        # Get team
        team = await firebase_service.get_document('teams', team_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Check if team is recruiting
        if team.get('status') != 'recruiting':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team is not recruiting"
            )
        
        # Check if already a member
        members = team.get('members', [])
        if current_user['uid'] in members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already a member of this team"
            )
        
        # Check team size limit
        max_members = team.get('max_members', 4)
        if len(members) >= max_members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team is full"
            )
        
        # Verify user is registered for the hackathon
        hackathon = await firebase_service.get_document('hackathons', team['hackathon_id'])
        if current_user['uid'] not in hackathon.get('participants', []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must be registered for hackathon to join team"
            )
        
        # Get user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        
        # Add member to team
        members.append(current_user['uid'])
        member_details = team.get('member_details', [])
        member_details.append({
            "uid": current_user['uid'],
            "name": profile.get('name', 'Unknown'),
            "role": "member",
            "joined_at": datetime.utcnow().isoformat()
        })
        
        await firebase_service.update_document('teams', team_id, {
            'members': members,
            'member_details': member_details,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        # Update user profile
        teams_joined = profile.get('teams_joined', [])
        teams_joined.append(team_id)
        await firebase_service.update_user_profile(current_user['uid'], {
            'teams_joined': teams_joined
        })
        
        return {"message": "Successfully joined team"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join team: {str(e)}"
        )

@router.delete("/{team_id}/leave")
async def leave_team(
    team_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Leave a team"""
    try:
        # Get team
        team = await firebase_service.get_document('teams', team_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Check if user is a member
        members = team.get('members', [])
        if current_user['uid'] not in members:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not a member of this team"
            )
        
        # Check if user is the leader
        if team.get('leader_id') == current_user['uid']:
            # If leader is leaving and there are other members, transfer leadership
            if len(members) > 1:
                new_leader_id = next(uid for uid in members if uid != current_user['uid'])
                new_leader_profile = await firebase_service.get_user_profile(new_leader_id)
                
                # Update member details
                member_details = team.get('member_details', [])
                for member in member_details:
                    if member['uid'] == new_leader_id:
                        member['role'] = 'leader'
                    elif member['uid'] == current_user['uid']:
                        member_details.remove(member)
                        break
                
                members.remove(current_user['uid'])
                
                await firebase_service.update_document('teams', team_id, {
                    'leader_id': new_leader_id,
                    'leader_name': new_leader_profile.get('name', 'Unknown'),
                    'members': members,
                    'member_details': member_details,
                    'updated_at': datetime.utcnow().isoformat()
                })
            else:
                # If leader is the only member, delete the team
                await firebase_service.delete_document('teams', team_id)
        else:
            # Remove member
            members.remove(current_user['uid'])
            member_details = team.get('member_details', [])
            member_details = [m for m in member_details if m['uid'] != current_user['uid']]
            
            await firebase_service.update_document('teams', team_id, {
                'members': members,
                'member_details': member_details,
                'updated_at': datetime.utcnow().isoformat()
            })
        
        # Update user profile
        profile = await firebase_service.get_user_profile(current_user['uid'])
        teams_joined = profile.get('teams_joined', [])
        if team_id in teams_joined:
            teams_joined.remove(team_id)
            await firebase_service.update_user_profile(current_user['uid'], {
                'teams_joined': teams_joined
            })
        
        return {"message": "Successfully left team"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave team: {str(e)}"
        )
