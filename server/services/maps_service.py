import os
import googlemaps
from typing import Optional, List, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)

class MapsService:
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        if not self.api_key:
            logger.warning("⚠️ Google Maps API key not found")
            self.gmaps = None
        else:
            try:
                self.gmaps = googlemaps.Client(key=self.api_key)
                logger.info("✅ Google Maps service initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Google Maps: {e}")
                self.gmaps = None
    
    def _check_client(self):
        """Check if Google Maps client is available"""
        if not self.gmaps:
            raise Exception("Google Maps service not available. Check API key configuration.")
    
    async def geocode_address(self, address: str) -> Optional[Dict[str, Any]]:
        """Geocode an address to get coordinates"""
        try:
            self._check_client()
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.geocode(address)
                )
            
            if result:
                return result[0]  # Return first result
            return None
        except Exception as e:
            logger.error(f"Geocoding error for address '{address}': {str(e)}")
            raise e
    
    async def reverse_geocode(self, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        """Reverse geocode coordinates to get address"""
        try:
            self._check_client()
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.reverse_geocode((lat, lng))
                )
            
            if result:
                return result[0]  # Return first result
            return None
        except Exception as e:
            logger.error(f"Reverse geocoding error for coordinates ({lat}, {lng}): {str(e)}")
            raise e
    
    async def search_places(self, query: str, location: Optional[Dict[str, float]] = None, radius: int = 5000) -> List[Dict[str, Any]]:
        """Search for places using Google Places API"""
        try:
            self._check_client()
            
            # Prepare location parameter
            location_param = None
            if location:
                location_param = (location['lat'], location['lng'])
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.places(
                        query=query,
                        location=location_param,
                        radius=radius
                    )
                )
            
            return result.get('results', [])
        except Exception as e:
            logger.error(f"Places search error for query '{query}': {str(e)}")
            raise e
    
    async def get_nearby_places(self, lat: float, lng: float, place_type: Optional[str] = None, radius: int = 1000) -> List[Dict[str, Any]]:
        """Get nearby places"""
        try:
            self._check_client()
            
            location = (lat, lng)
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.places_nearby(
                        location=location,
                        radius=radius,
                        type=place_type
                    )
                )
            
            return result.get('results', [])
        except Exception as e:
            logger.error(f"Nearby places error for location ({lat}, {lng}): {str(e)}")
            raise e
    
    async def get_directions(self, origin: str, destination: str, mode: str = "driving") -> Optional[Dict[str, Any]]:
        """Get directions between two points"""
        try:
            self._check_client()
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.directions(
                        origin=origin,
                        destination=destination,
                        mode=mode
                    )
                )
            
            if result:
                return result[0]  # Return first route
            return None
        except Exception as e:
            logger.error(f"Directions error from '{origin}' to '{destination}': {str(e)}")
            raise e
    
    async def get_distance_matrix(self, origins: List[str], destinations: List[str], mode: str = "driving") -> Dict[str, Any]:
        """Get distance matrix between multiple origins and destinations"""
        try:
            self._check_client()
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.distance_matrix(
                        origins=origins,
                        destinations=destinations,
                        mode=mode
                    )
                )
            
            return result
        except Exception as e:
            logger.error(f"Distance matrix error: {str(e)}")
            raise e
    
    async def get_place_details(self, place_id: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """Get detailed information about a place"""
        try:
            self._check_client()
            
            if not fields:
                fields = [
                    'name', 'formatted_address', 'geometry', 'rating', 
                    'formatted_phone_number', 'website', 'opening_hours'
                ]
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.place(
                        place_id=place_id,
                        fields=fields
                    )
                )
            
            return result.get('result', {})
        except Exception as e:
            logger.error(f"Place details error for place_id '{place_id}': {str(e)}")
            raise e
    
    async def autocomplete_places(self, input_text: str, location: Optional[Dict[str, float]] = None, radius: int = 50000) -> List[Dict[str, Any]]:
        """Get place autocomplete suggestions"""
        try:
            self._check_client()
            
            # Prepare location parameter
            location_param = None
            if location:
                location_param = (location['lat'], location['lng'])
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.places_autocomplete(
                        input_text=input_text,
                        location=location_param,
                        radius=radius
                    )
                )
            
            return result
        except Exception as e:
            logger.error(f"Places autocomplete error for input '{input_text}': {str(e)}")
            raise e
    
    async def get_timezone(self, lat: float, lng: float) -> Dict[str, Any]:
        """Get timezone information for coordinates"""
        try:
            self._check_client()
            
            location = (lat, lng)
            
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.gmaps.timezone(location)
                )
            
            return result
        except Exception as e:
            logger.error(f"Timezone error for coordinates ({lat}, {lng}): {str(e)}")
            raise e
    
    def get_static_map_url(self, center: str, zoom: int = 15, size: str = "600x400", markers: Optional[List[str]] = None) -> str:
        """Generate static map URL"""
        try:
            base_url = "https://maps.googleapis.com/maps/api/staticmap"
            params = [
                f"center={center}",
                f"zoom={zoom}",
                f"size={size}",
                f"key={self.api_key}"
            ]
            
            if markers:
                for marker in markers:
                    params.append(f"markers={marker}")
            
            return f"{base_url}?{'&'.join(params)}"
        except Exception as e:
            logger.error(f"Static map URL error: {str(e)}")
            raise e
