import React from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';
import GoogleMap from './GoogleMap';

const GoogleMapsWrapper = ({ children, ...props }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Google Maps API key not configured</p>
      </div>
    );
  }

  const render = (status) => {
    switch (status) {
      case 'LOADING':
        return (
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        );
      case 'FAILURE':
        return (
          <div className="w-full h-64 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
            <p className="text-red-600">Failed to load Google Maps</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Wrapper 
      apiKey={apiKey} 
      render={render}
      libraries={['places', 'geometry']}
    >
      <GoogleMap {...props} />
    </Wrapper>
  );
};

export default GoogleMapsWrapper;
