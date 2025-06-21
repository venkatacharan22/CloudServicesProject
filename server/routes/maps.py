from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.firebase_service import firebase_service
from services.maps_service import MapsService
import os

router = APIRouter()
security = HTTPBearer()

# Initialize maps service
maps_service = MapsService()

class GeocodeRequest(BaseModel):
    address: str

class PlacesSearchRequest(BaseModel):
    query: str
    location: Optional[Dict[str, float]] = None  # {"lat": 40.7128, "lng": -74.0060}
    radius: Optional[int] = 5000  # meters

class DirectionsRequest(BaseModel):
    origin: str
    destination: str
    mode: Optional[str] = "driving"  # driving, walking, transit, bicycling

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

@router.get("/geocode")
async def geocode_address(
    address: str,
    current_user: dict = Depends(get_current_user)
):
    """Geocode an address to get coordinates"""
    try:
        result = await maps_service.geocode_address(address)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        return {
            "address": address,
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to geocode address: {str(e)}"
        )

@router.get("/reverse-geocode")
async def reverse_geocode(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user)
):
    """Reverse geocode coordinates to get address"""
    try:
        result = await maps_service.reverse_geocode(lat, lng)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No address found for coordinates"
            )
        
        return {
            "coordinates": {"lat": lat, "lng": lng},
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reverse geocode: {str(e)}"
        )

@router.post("/places/search")
async def search_places(
    search_request: PlacesSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for places using Google Places API"""
    try:
        results = await maps_service.search_places(
            query=search_request.query,
            location=search_request.location,
            radius=search_request.radius
        )
        
        return {
            "query": search_request.query,
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search places: {str(e)}"
        )

@router.get("/places/nearby")
async def get_nearby_places(
    lat: float,
    lng: float,
    place_type: Optional[str] = None,
    radius: Optional[int] = 1000,
    current_user: dict = Depends(get_current_user)
):
    """Get nearby places"""
    try:
        results = await maps_service.get_nearby_places(
            lat=lat,
            lng=lng,
            place_type=place_type,
            radius=radius
        )
        
        return {
            "location": {"lat": lat, "lng": lng},
            "place_type": place_type,
            "radius": radius,
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get nearby places: {str(e)}"
        )

@router.post("/directions")
async def get_directions(
    directions_request: DirectionsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get directions between two points"""
    try:
        result = await maps_service.get_directions(
            origin=directions_request.origin,
            destination=directions_request.destination,
            mode=directions_request.mode
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No route found"
            )
        
        return {
            "origin": directions_request.origin,
            "destination": directions_request.destination,
            "mode": directions_request.mode,
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get directions: {str(e)}"
        )

@router.get("/distance-matrix")
async def get_distance_matrix(
    origins: str,  # comma-separated addresses
    destinations: str,  # comma-separated addresses
    mode: Optional[str] = "driving",
    current_user: dict = Depends(get_current_user)
):
    """Get distance matrix between multiple origins and destinations"""
    try:
        origins_list = [origin.strip() for origin in origins.split(',')]
        destinations_list = [dest.strip() for dest in destinations.split(',')]
        
        result = await maps_service.get_distance_matrix(
            origins=origins_list,
            destinations=destinations_list,
            mode=mode
        )
        
        return {
            "origins": origins_list,
            "destinations": destinations_list,
            "mode": mode,
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get distance matrix: {str(e)}"
        )

@router.get("/venue-suggestions")
async def get_venue_suggestions(
    city: str,
    venue_type: Optional[str] = "conference_center",
    capacity: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get venue suggestions for hackathons"""
    try:
        # First geocode the city
        city_location = await maps_service.geocode_address(city)
        if not city_location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="City not found"
            )
        
        # Search for venues
        search_query = f"{venue_type} in {city}"
        if capacity:
            search_query += f" capacity {capacity}"
        
        venues = await maps_service.search_places(
            query=search_query,
            location=city_location['geometry']['location'],
            radius=10000  # 10km radius
        )
        
        return {
            "city": city,
            "venue_type": venue_type,
            "capacity": capacity,
            "venues": venues
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get venue suggestions: {str(e)}"
        )

# Removed duplicate endpoint - already defined above
