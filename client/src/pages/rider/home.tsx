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
        .catch(() => setPickupAddress(`${geolocation.latitude?.toFixed(4)}, ${geolocation.longitude?.toFixed(4)}`));
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
      proceedToBooking(location.address, location.lat, location.lng);
    }, 500);
  };

  const handleManualDestination = () => {
    if (dropoffAddress.trim()) {
      // For manual destinations, use geolocation or default coordinates
      proceedToBooking(dropoffAddress, 28.6149, 77.2085); // Default to Delhi coordinates
    }
  };

  const proceedToBooking = (destination: string, destLat?: number, destLng?: number) => {
    if (!geolocation.latitude || !geolocation.longitude) {
      toast({
        title: "Location required",
        description: "Please enable location access to book a ride.",
        variant: "destructive"
      });
      return;
    }

    // Prepare trip data for booking page
    const tripData = {
      pickup: {
        lat: geolocation.latitude,
        lng: geolocation.longitude,
        address: pickupAddress
      },
      dropoff: {
        lat: destLat || 28.6149,
        lng: destLng || 77.2085,
        address: destination
      }
    };

    // Store trip data in localStorage for booking page
    localStorage.setItem('tripData', JSON.stringify(tripData));
    
    setLocation("/rider/booking");
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

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900" data-testid="where-to-title">Where to?</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleRecentRides}
                data-testid="recent-rides-button"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <History className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Recent</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRideHistory}
                data-testid="view-history-button"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <Clock className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">History</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={geolocation.loading}
                data-testid="get-location-button"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <Navigation className={`h-4 w-4 ${geolocation.loading ? 'animate-spin' : ''}`} />
                <span className="text-xs hidden sm:inline">GPS</span>
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
          
          {/* Enhanced Location Inputs */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0" data-testid="pickup-indicator"></div>
              <Input
                type="text"
                placeholder="Pickup location"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary h-12 text-sm"
                data-testid="pickup-input"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={geolocation.loading}
                className="p-2 hover:bg-gray-100 rounded-lg"
                data-testid="use-current-location"
              >
                <MapPin className={`h-5 w-5 ${geolocation.loading ? 'text-gray-400 animate-pulse' : 'text-rider-primary'}`} />
              </Button>
            </div>
            
            <div className="w-full border-l-2 border-dashed border-gray-300 ml-2 h-4"></div>
            
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 border-2 border-red-500 rounded-full flex-shrink-0" data-testid="dropoff-indicator"></div>
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
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary h-12 text-sm"
                data-testid="dropoff-input"
              />
              {dropoffAddress.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDropoffAddress('');
                    setShowLocationSearch(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-gray-400 text-lg">×</span>
                </Button>
              )}
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
                      proceedToBooking(ride.dropoffAddress, parseFloat(ride.dropoffLat), parseFloat(ride.dropoffLng));
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

          {/* Quick Actions & Locations */}
          {!showLocationSearch && !showRecentRides && (
            <div className="space-y-4">
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 border-2 hover:border-rider-primary hover:bg-rider-primary/5"
                  onClick={handleRideHistory}
                  data-testid="quick-history-button"
                >
                  <History className="h-6 w-6 text-gray-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">Ride History</p>
                    <p className="text-xs text-gray-500">{rideHistory.length} trips</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 border-2 hover:border-rider-primary hover:bg-rider-primary/5"
                  onClick={handleGetCurrentLocation}
                  disabled={geolocation.loading}
                  data-testid="quick-location-button"
                >
                  <Navigation className={`h-6 w-6 text-gray-600 ${geolocation.loading ? 'animate-spin' : ''}`} />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">My Location</p>
                    <p className="text-xs text-gray-500">{geolocation.loading ? 'Getting...' : 'Update GPS'}</p>
                  </div>
                </Button>
              </div>

              {/* Saved Destinations */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600" data-testid="recent-destinations-title">Saved destinations</h3>
                <div className="space-y-2">
                  {locationSearch.getSavedLocations().slice(0, 3).map((location) => (
                    <Button
                      key={location.id}
                      variant="ghost"
                      className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg justify-start h-auto border border-gray-100"
                      onClick={() => handleLocationSelect(location)}
                      data-testid={`location-${location.id}`}
                    >
                      {location.id === "home" ? (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Home className="h-4 w-4 text-green-600" />
                        </div>
                      ) : location.id === "work" ? (
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <MapPin className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                      <div className="text-left flex-1">
                        <p className="font-medium text-gray-900">{location.name}</p>
                        <p className="text-sm text-gray-500">{location.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-rider-primary font-medium">Select</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Book Ride Button */}
          {dropoffAddress.trim() && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800">Ready to book</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Tap below to see vehicle options and pricing
                </p>
              </div>
              <Button
                className="w-full bg-rider-primary text-white py-4 rounded-xl font-semibold hover:bg-rider-primary/90 shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                onClick={handleManualDestination}
                data-testid="proceed-booking-button"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Choose Vehicle & Book Ride</span>
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">→</span>
                  </div>
                </div>
              </Button>
            </div>
          )}

          {/* No destination message */}
          {!dropoffAddress.trim() && !showLocationSearch && !showRecentRides && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Enter your destination to get started</p>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
