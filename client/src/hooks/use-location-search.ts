import { useState, useCallback } from 'react';

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'current' | 'saved' | 'search';
}

// Mock location data for demonstration
const savedLocations: LocationSuggestion[] = [
  {
    id: "home",
    name: "Home",
    address: "123 Main Street, Downtown",
    lat: 28.6139,
    lng: 77.2090,
    type: 'saved'
  },
  {
    id: "work",
    name: "Work",
    address: "456 Business Ave, Tech District",
    lat: 28.6129,
    lng: 77.2295,
    type: 'saved'
  },
  {
    id: "mall",
    name: "Central Mall",
    address: "Central Mall, Sector 21",
    lat: 28.6149,
    lng: 77.2085,
    type: 'saved'
  },
  {
    id: "airport",
    name: "Airport",
    address: "Airport Terminal 1",
    lat: 28.5562,
    lng: 77.1000,
    type: 'saved'
  },
];

const searchableLocations: LocationSuggestion[] = [
  ...savedLocations,
  {
    id: "restaurant1",
    name: "Pizza Palace",
    address: "789 Food Street, City Center",
    lat: 28.6200,
    lng: 77.2100,
    type: 'search'
  },
  {
    id: "hospital1",
    name: "City General Hospital",
    address: "321 Medical Avenue, Health District",
    lat: 28.6050,
    lng: 77.2150,
    type: 'search'
  },
  {
    id: "school1",
    name: "Delhi Public School",
    address: "654 Education Road, School Zone",
    lat: 28.6180,
    lng: 77.2250,
    type: 'search'
  }
];

export function useLocationSearch() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const searchLocations = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filtered = searchableLocations.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.address.toLowerCase().includes(query.toLowerCase())
    );
    
    setLoading(false);
    setSuggestions(filtered);
    return filtered;
  }, []);

  const getSavedLocations = useCallback((): LocationSuggestion[] => {
    return savedLocations;
  }, []);

  const addCurrentLocation = useCallback((lat: number, lng: number, address?: string): LocationSuggestion => {
    return {
      id: "current",
      name: "Current Location",
      address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
      type: 'current'
    };
  }, []);

  const geocodeAddress = useCallback(async (address: string): Promise<LocationSuggestion | null> => {
    setLoading(true);
    
    // Mock geocoding - in real app, use Google Maps Geocoding API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple mock geocoding
    const mockResult: LocationSuggestion = {
      id: `geocode-${Date.now()}`,
      name: address.split(',')[0] || address,
      address: address,
      lat: 28.6139 + (Math.random() - 0.5) * 0.1,
      lng: 77.2090 + (Math.random() - 0.5) * 0.1,
      type: 'search'
    };
    
    setLoading(false);
    return mockResult;
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    // Mock reverse geocoding - in real app, use Google Maps Geocoding API
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Find nearest known location or return coordinates
    const nearest = searchableLocations.find(location => {
      const distance = Math.sqrt(
        Math.pow(location.lat - lat, 2) + Math.pow(location.lng - lng, 2)
      );
      return distance < 0.01; // Within ~1km
    });
    
    return nearest?.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }, []);

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const calculateDuration = useCallback((distance: number): number => {
    // Assume average speed of 25 km/h in city traffic
    return Math.round((distance / 25) * 60);
  }, []);

  return {
    suggestions,
    loading,
    searchLocations,
    getSavedLocations,
    addCurrentLocation,
    geocodeAddress,
    reverseGeocode,
    calculateDistance,
    calculateDuration
  };
}