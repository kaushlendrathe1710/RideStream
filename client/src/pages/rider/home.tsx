import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Briefcase, MapPin, Navigation, Clock, Star, History } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationSearch } from "@/hooks/use-location-search";
import { useToast } from "@/hooks/use-toast";
import type { RideWithDetails } from "@shared/schema";

export default function RiderHome() {
  const [, setLocation] = useLocation();
  const [pickupAddress, setPickupAddress] = useState("Current Location");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [showRecentRides, setShowRecentRides] = useState(false);
  const { toast } = useToast();
  
  // Get current user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  const geolocation = useGeolocation();
  const locationSearch = useLocationSearch();

  // Fetch user's ride history
  const { data: rideHistory = [] } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/riders', user?.id, 'rides'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/riders/${user.id}/rides`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Check for active ride
  const { data: activeRide } = useQuery<RideWithDetails | null>({
    queryKey: ['/api/riders', user?.id, 'active-ride'],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/riders/${user.id}/active-ride`);
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (geolocation.latitude && geolocation.longitude && pickupAddress === "Current Location") {
      // Update pickup address when location is available
      locationSearch.reverseGeocode(geolocation.latitude, geolocation.longitude)
        .then(address => setPickupAddress(address))
        .catch(() => setPickupAddress(`${geolocation.latitude.toFixed(4)}, ${geolocation.longitude.toFixed(4)}`));
    }
  }, [geolocation.latitude, geolocation.longitude, pickupAddress, locationSearch]);

  // Redirect to active ride if exists
  useEffect(() => {
    if (activeRide && ['searching', 'driver_assigned', 'driver_arrived', 'in_progress'].includes(activeRide.status)) {
      setLocation(`/rider/trip/${activeRide.id}`);
    }
  }, [activeRide, setLocation]);

  const handleModeSwitch = () => {
    setLocation("/driver");
  };

  const handleLocationSelect = (location: any) => {
    setDropoffAddress(location.address);
    setShowLocationSearch(false);
    setTimeout(() => {
      setLocation("/rider/booking");
    }, 500);
  };

  const handleManualDestination = () => {
    if (dropoffAddress.trim()) {
      setLocation("/rider/booking");
    }
  };

  const handleGetCurrentLocation = () => {
    if (geolocation.loading) return;
    
    geolocation.getCurrentLocation();
    toast({
      title: "Getting location",
      description: "Fetching your current location..."
    });
  };

  const handleSearchLocation = async (query: string) => {
    if (query.length < 2) return;
    await locationSearch.searchLocations(query);
  };

  const toggleRecentRides = () => {
    setShowRecentRides(!showRecentRides);
    setShowLocationSearch(false);
  };

  const handleRideHistory = () => {
    setLocation('/rider/history');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      case 'searching': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'in_progress': return 'In Progress';
      case 'searching': return 'Searching';
      case 'driver_assigned': return 'Driver Assigned';
      case 'driver_arrived': return 'Driver Arrived';
      default: return status;
    }
  };

  return (
    <>
      <Header
        title={user?.name ? `Hi, ${user.name.split(' ')[0]}!` : "Book a Ride"}
        mode="rider"
        onModeSwitch={handleModeSwitch}
      />

      <Map
        currentLocation={
          geolocation.latitude && geolocation.longitude
            ? { lat: geolocation.latitude, lng: geolocation.longitude }
            : { lat: 28.6139, lng: 77.2090 }
        }
      />

      <BottomSheet>
        <div className="p-6 space-y-4">
          {/* Active Ride Alert */}
          {activeRide && (
            <Card className="border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">You have an active ride</p>
                  <p className="text-sm text-blue-700">{activeRide.pickupAddress} → {activeRide.dropoffAddress}</p>
                </div>
                <Badge className={getStatusColor(activeRide.status)}>
                  {getStatusText(activeRide.status)}
                </Badge>
              </div>
              <Button 
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                onClick={() => setLocation(`/rider/trip/${activeRide.id}`)}
              >
                View Trip Details
              </Button>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900" data-testid="where-to-title">Where to?</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRecentRides}
                data-testid="recent-rides-button"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={geolocation.loading}
                data-testid="get-location-button"
              >
                <Navigation className={`h-4 w-4 ${geolocation.loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Location Status */}
          {geolocation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800" data-testid="location-error">{geolocation.error}</p>
            </div>
          )}

          {geolocation.accuracy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800" data-testid="location-accuracy">
                Location accuracy: {Math.round(geolocation.accuracy)}m
              </p>
            </div>
          )}
          
          {/* Location Inputs */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-rider-primary rounded-full" data-testid="pickup-indicator"></div>
              <Input
                type="text"
                placeholder="Pickup location"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary"
                data-testid="pickup-input"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                data-testid="use-current-location"
              >
                <MapPin className="h-4 w-4 text-rider-primary" />
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 border-2 border-gray-400 rounded-full" data-testid="dropoff-indicator"></div>
              <Input
                type="text"
                placeholder="Where to?"
                value={dropoffAddress}
                onChange={(e) => {
                  setDropoffAddress(e.target.value);
                  handleSearchLocation(e.target.value);
                  setShowLocationSearch(e.target.value.length > 0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleManualDestination()}
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary"
                data-testid="dropoff-input"
              />
            </div>
          </div>

          {/* Search Results */}
          {showLocationSearch && locationSearch.suggestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600" data-testid="search-results-title">Search Results</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {locationSearch.suggestions.slice(0, 5).map((location) => (
                  <Button
                    key={location.id}
                    variant="ghost"
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg justify-start h-auto"
                    onClick={() => handleLocationSelect(location)}
                    data-testid={`search-result-${location.id}`}
                  >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Rides */}
          {showRecentRides && rideHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-600" data-testid="recent-rides-title">Recent rides</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRideHistory}
                  className="text-xs text-rider-primary"
                >
                  View all
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rideHistory.slice(0, 5).map((ride) => (
                  <Button
                    key={ride.id}
                    variant="ghost"
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg h-auto"
                    onClick={() => {
                      setDropoffAddress(ride.dropoffAddress);
                      setShowRecentRides(false);
                    }}
                    data-testid={`recent-ride-${ride.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900 text-sm">{ride.dropoffAddress}</p>
                        <p className="text-xs text-gray-500">{ride.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-xs ${getStatusColor(ride.status)}`}>
                        {getStatusText(ride.status)}
                      </Badge>
                      {ride.fare && (
                        <p className="text-xs text-gray-600 mt-1">₹{ride.fare}</p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Locations */}
          {!showLocationSearch && !showRecentRides && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600" data-testid="recent-destinations-title">Saved destinations</h3>
              <div className="space-y-2">
                {locationSearch.getSavedLocations().slice(0, 3).map((location) => (
                  <Button
                    key={location.id}
                    variant="ghost"
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg justify-start h-auto"
                    onClick={() => handleLocationSelect(location)}
                    data-testid={`location-${location.id}`}
                  >
                    {location.id === "home" ? (
                      <Home className="h-5 w-5 text-gray-400" />
                    ) : location.id === "work" ? (
                      <Briefcase className="h-5 w-5 text-gray-400" />
                    ) : (
                      <MapPin className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Book Ride Button */}
          {dropoffAddress.trim() && (
            <Button
              className="w-full bg-rider-primary text-white py-4 rounded-xl font-semibold hover:bg-rider-primary/90"
              onClick={handleManualDestination}
              data-testid="proceed-booking-button"
            >
              Choose Vehicle
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
