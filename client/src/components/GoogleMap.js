import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';

const GoogleMap = ({
  center = { lat: 40.7128, lng: -74.0060 },
  zoom = 13,
  onLocationSelect,
  markers = [],
  height = '400px',
  searchEnabled = true,
  enablePinDrop = false,
  showPinDropInstructions = true
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [droppedPin, setDroppedPin] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (window.google && mapRef.current) {
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (map && markers.length > 0) {
      addMarkers();
    }
  }, [map, markers]);

  const initializeMap = () => {
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    setMap(mapInstance);

    // Initialize search box if enabled
    if (searchEnabled && searchInputRef.current) {
      const searchBoxInstance = new window.google.maps.places.SearchBox(searchInputRef.current);
      setSearchBox(searchBoxInstance);

      // Bias the SearchBox results towards current map's viewport
      mapInstance.addListener('bounds_changed', () => {
        searchBoxInstance.setBounds(mapInstance.getBounds());
      });

      searchBoxInstance.addListener('places_changed', () => {
        const places = searchBoxInstance.getPlaces();
        if (places.length === 0) return;

        const place = places[0];
        if (!place.geometry || !place.geometry.location) return;

        // Update map center
        mapInstance.setCenter(place.geometry.location);
        mapInstance.setZoom(15);

        // Add marker
        new window.google.maps.Marker({
          position: place.geometry.location,
          map: mapInstance,
          title: place.name,
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        // Callback with selected location
        if (onLocationSelect) {
          onLocationSelect({
            name: place.name,
            address: place.formatted_address,
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            place_id: place.place_id
          });
        }
      });
    }

    // Add click listener for manual location selection
    if (enablePinDrop) {
      mapInstance.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // Remove previous dropped pin if exists
        if (droppedPin) {
          droppedPin.setMap(null);
        }

        // Reverse geocoding to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;

            // Add new marker with custom styling
            const newPin = new window.google.maps.Marker({
              position: { lat, lng },
              map: mapInstance,
              title: `📍 ${address}`,
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new window.google.maps.Size(40, 40)
              },
              animation: window.google.maps.Animation.DROP
            });

            // Add info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; max-width: 200px;">
                  <h4 style="margin: 0 0 8px 0; color: #1f2937;">📍 Selected Location</h4>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">${address}</p>
                  <button onclick="this.parentElement.parentElement.parentElement.style.display='none'"
                          style="margin-top: 8px; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    Remove Pin
                  </button>
                </div>
              `
            });

            newPin.addListener('click', () => {
              infoWindow.open(mapInstance, newPin);
            });

            setDroppedPin(newPin);

            // Callback with selected location
            if (onLocationSelect) {
              onLocationSelect({
                name: 'Selected Location',
                address,
                coordinates: { lat, lng }
              });
            }
          }
        });
      });
    }
  };

  const addMarkers = () => {
    markers.forEach(marker => {
      new window.google.maps.Marker({
        position: marker.position,
        map,
        title: marker.title,
        icon: marker.icon || {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setCurrentLocation(pos);
          if (map) {
            map.setCenter(pos);
            map.setZoom(15);
            
            new window.google.maps.Marker({
              position: pos,
              map,
              title: 'Your Location',
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(32, 32)
              }
            });
          }
        },
        () => {
          console.error('Error: The Geolocation service failed.');
        }
      );
    }
  };

  const clearDroppedPin = () => {
    if (droppedPin) {
      droppedPin.setMap(null);
      setDroppedPin(null);
      if (onLocationSelect) {
        onLocationSelect(null);
      }
    }
  };

  return (
    <div className="relative">
      {searchEnabled && (
        <div className="absolute top-4 left-4 right-4 z-10 flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for places..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={getCurrentLocation}
            className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            title="Get current location"
          >
            <Navigation className="w-5 h-5 text-gray-600" />
          </button>
          {enablePinDrop && droppedPin && (
            <button
              onClick={clearDroppedPin}
              className="p-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Clear dropped pin"
            >
              <MapPin className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {enablePinDrop && showPinDropInstructions && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-3 shadow-sm">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>Click anywhere on the map to drop a pin and select location</span>
            </div>
          </div>
        </div>
      )}
      
      <div
        ref={mapRef}
        style={{ height }}
        className="w-full rounded-lg border border-gray-300"
      />
      
      {!window.google && (
        <div 
          style={{ height }}
          className="w-full rounded-lg border border-gray-300 flex items-center justify-center bg-gray-100"
        >
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
