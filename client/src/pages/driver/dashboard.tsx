import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MapPin, Navigation, Wifi, WifiOff, AlertCircle, TrendingUp, Clock, Bell, ArrowRight, Timer, DollarSign, Car, Activity, AlertTriangle } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationSearch } from "@/hooks/use-location-search";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { calculateDistance } from "@/lib/mock-data";
import type { RideWithDetails, Driver } from "@shared/schema";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get current user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      setLocation('/login');
      return;
    }
  }, [user, setLocation]);

  // Get driver profile for current user
  const { data: driverProfile } = useQuery<Driver>({
    queryKey: ['/api/drivers/user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const response = await fetch(`/api/drivers/user/${user.id}`);
      if (!response.ok) throw new Error('Driver not found');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Enhanced geolocation tracking for drivers
  const geolocation = useGeolocation({ 
    watch: isOnline, // Only track location when online
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 5000
  });
  const locationSearch = useLocationSearch();

  // Check for driver-specific ride requests
  const { data: pendingRides = [] } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/drivers', driverProfile?.id, 'ride-requests'],
    queryFn: async () => {
      if (!driverProfile?.id || !geolocation.latitude || !geolocation.longitude) return [];
      
      // Get all pending ride requests
      const response = await fetch('/api/ride-requests');
      const allRequests = await response.json();
      
      // Filter for driver's vehicle type and nearby requests
      const nearbyRequests = allRequests.filter((ride: RideWithDetails) => {
        if (ride.vehicleType !== driverProfile.vehicleType) return false;
        
        const distance = calculateDistance(
          geolocation.latitude!,
          geolocation.longitude!,
          parseFloat(ride.pickupLat),
          parseFloat(ride.pickupLng)
        );
        
        return distance <= 10; // Within 10km
      });
      
      return nearbyRequests;
    },
    refetchInterval: isOnline ? 3000 : false, // Check every 3 seconds when online
    enabled: !!driverProfile?.id && !!geolocation.latitude && !!geolocation.longitude,
  });
  
  // Track previous ride requests to detect new ones
  const [previousRequestCount, setPreviousRequestCount] = useState(0);
  const [lastNotifiedRequest, setLastNotifiedRequest] = useState<string | null>(null);
  
  // Show notification for new ride requests
  useEffect(() => {
    if (pendingRides.length > previousRequestCount && pendingRides.length > 0) {
      const newestRequest = pendingRides[0];
      if (newestRequest.id !== lastNotifiedRequest) {
        toast({
          title: "🚗 New Ride Request!",
          description: `Pickup: ${newestRequest.pickupAddress} - ₹${Math.round(parseFloat(newestRequest.fare || '0'))}`,
          duration: 5000,
        });
        setLastNotifiedRequest(newestRequest.id);
      }
    }
    setPreviousRequestCount(pendingRides.length);
  }, [pendingRides, previousRequestCount, toast, lastNotifiedRequest]);

  // Check for active ride
  const { data: activeRide } = useQuery<RideWithDetails | null>({
    queryKey: ['/api/drivers', driverProfile?.id, 'active-ride'],
    queryFn: async () => {
      if (!driverProfile?.id) return null;
      const response = await fetch(`/api/drivers/${driverProfile.id}/active-ride`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: !!driverProfile?.id,
  });

  // Fetch driver's ride history
  const { data: rideHistory = [] } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/drivers', driverProfile?.id, 'rides'],
    queryFn: async () => {
      if (!driverProfile?.id) return [];
      const response = await fetch(`/api/drivers/${driverProfile.id}/rides`);
      return response.json();
    },
    enabled: !!driverProfile?.id,
  });

  // Update driver location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (locationData: { lat: number; lng: number; heading?: number; speed?: number }) => {
      if (!driverProfile?.id) throw new Error('No driver profile');
      return apiRequest(`/api/drivers/${driverProfile.id}`, 'PATCH', {
        currentLat: locationData.lat.toString(),
        currentLng: locationData.lng.toString(),
        isOnline: isOnline
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
    },
    onError: (error) => {
      console.error('Failed to update driver location:', error);
    }
  });

  // Toggle online status mutation
  const toggleOnlineMutation = useMutation({
    mutationFn: async (online: boolean) => {
      if (!driverProfile?.id) throw new Error('No driver profile');
      return apiRequest(`/api/drivers/${driverProfile.id}`, 'PATCH', {
        isOnline: online,
        ...(geolocation.latitude && geolocation.longitude && {
          currentLat: geolocation.latitude.toString(),
          currentLng: geolocation.longitude.toString(),
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/user', user?.id] });
      toast({
        title: isOnline ? "You're offline" : "You're online",
        description: isOnline ? "You won't receive ride requests" : "You can now receive ride requests"
      });
    },
    onError: (error) => {
      console.error('Failed to update online status:', error);
      toast({
        title: "Update failed",
        description: "Could not update your status. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Redirect to active ride if exists
  useEffect(() => {
    if (activeRide && ['driver_assigned', 'driver_arrived', 'in_progress'].includes(activeRide.status)) {
      setLocation(`/driver/trip/${activeRide.id}`);
    }
  }, [activeRide, setLocation]);

  // Disabled automatic navigation - let driver choose
  // useEffect(() => {
  //   if (pendingRides && pendingRides.length > 0 && isOnline) {
  //     setLocation(`/driver/ride-request/${pendingRides[0].id}`);
  //   }
  // }, [pendingRides, isOnline, setLocation]);

  const handleModeSwitch = () => {
    setLocation("/rider");
  };
  
  // Handle incoming ride request
  const handleViewRideRequest = (rideId: string) => {
    setLocation(`/driver/ride-request/${rideId}`);
  };

  // Real-time location updates when online
  useEffect(() => {
    if (isOnline && geolocation.latitude && geolocation.longitude) {
      // Update location every 10 seconds when online
      const interval = setInterval(() => {
        updateLocationMutation.mutate({
          lat: geolocation.latitude!,
          lng: geolocation.longitude!,
          heading: geolocation.heading || undefined,
          speed: geolocation.speed || undefined
        });
      }, 10000);

      setLocationUpdateInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
        setLocationUpdateInterval(null);
      }
    }
  }, [isOnline, geolocation.latitude, geolocation.longitude, geolocation.heading, geolocation.speed]);

  // Handle geolocation errors
  useEffect(() => {
    if (geolocation.error && isOnline) {
      toast({
        title: "Location access required",
        description: geolocation.error,
        variant: "destructive"
      });
    }
  }, [geolocation.error, isOnline, toast]);

  const handleToggleOnline = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    toggleOnlineMutation.mutate(newStatus);
  };

  const handleViewEarnings = () => {
    setLocation('/driver/earnings');
  };

  // Calculate real stats from ride history
  const todayRides = rideHistory.filter(ride => {
    const today = new Date().toDateString();
    return new Date(ride.createdAt).toDateString() === today;
  });

  const completedTodayRides = todayRides.filter(ride => ride.status === 'completed');
  const totalEarningsToday = completedTodayRides.reduce((sum, ride) => {
    return sum + (parseFloat(ride.fare || '0'));
  }, 0);

  const stats = {
    trips: completedTodayRides.length,
    hours: `${Math.max(1, Math.floor(completedTodayRides.length * 0.75))}h`, // Estimate based on trips
    earnings: `₹${totalEarningsToday.toFixed(0)}`
  };

  // Use real recent trips from API
  const recentTrips = rideHistory.slice(0, 3).map(ride => ({
    id: ride.id,
    from: ride.pickupAddress.split(',')[0],
    to: ride.dropoffAddress.split(',')[0],
    distance: ride.distance ? `${ride.distance} km` : 'N/A',
    duration: ride.duration ? `${ride.duration} min` : 'N/A',
    timeAgo: getTimeAgo(ride.createdAt),
    fare: ride.fare ? `₹${ride.fare}` : 'N/A',
    rating: 4.8 // Mock rating for now
  }));

  function getTimeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Update online status from driver profile
  useEffect(() => {
    if (driverProfile) {
      setIsOnline(driverProfile.isOnline || false);
    }
  }, [driverProfile]);

  // Don't render if no driver profile yet
  if (!user || !driverProfile) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-driver-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title={`Hi, ${user.name?.split(' ')[0] || 'Driver'}!`}
        mode="driver"
        onModeSwitch={handleModeSwitch}
      />

      <Map
        showDriverMarkers
        currentLocation={
          geolocation.latitude && geolocation.longitude
            ? { lat: geolocation.latitude, lng: geolocation.longitude }
            : { lat: 28.6139, lng: 77.2090 }
        }
      />

      <BottomSheet>
        <div className="p-6 space-y-4">
          {/* Ride Request Notifications */}
          {isOnline && pendingRides.length > 0 && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <Bell className="h-4 w-4 text-orange-600" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-orange-800">
                    {pendingRides.length} ride request{pendingRides.length > 1 ? 's' : ''} nearby!
                  </p>
                  <p className="text-sm text-orange-600">
                    Closest pickup: {pendingRides[0]?.pickupAddress}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleViewRideRequest(pendingRides[0].id)}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  View
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* No Requests Message */}
          {isOnline && pendingRides.length === 0 && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Activity className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <p className="font-medium text-blue-800">You're online and ready!</p>
                <p className="text-sm text-blue-600">Waiting for ride requests in your area...</p>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Offline Message */}
          {!isOnline && (
            <Alert className="mb-4 border-gray-200 bg-gray-50">
              <AlertTriangle className="h-4 w-4 text-gray-600" />
              <AlertDescription>
                <p className="font-medium text-gray-800">You're offline</p>
                <p className="text-sm text-gray-600">Turn on your status to receive ride requests</p>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Location Status */}
          {geolocation.error && isOnline && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800" data-testid="location-error">{geolocation.error}</p>
              </div>
            </div>
          )}

          {geolocation.accuracy && isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Navigation className={`h-4 w-4 text-blue-600 ${geolocation.isWatching ? 'animate-pulse' : ''}`} />
                  <p className="text-sm text-blue-800" data-testid="location-accuracy">
                    GPS accuracy: {Math.round(geolocation.accuracy)}m
                  </p>
                </div>
                {geolocation.speed && (
                  <p className="text-sm text-blue-800">
                    Speed: {Math.round((geolocation.speed || 0) * 3.6)} km/h
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Online/Offline Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-gray-900" data-testid="online-status">
                  You're {isOnline ? "online" : "offline"}
                </h2>
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500" data-testid="online-description">
                {isOnline ? "Ready to accept rides" : "Go online to accept rides"}
              </p>
              {isOnline && geolocation.latitude && geolocation.longitude && (
                <p className="text-xs text-green-600 mt-1" data-testid="location-status">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Location tracking active
                </p>
              )}
            </div>
            <Button
              variant={isOnline ? "default" : "outline"}
              onClick={handleToggleOnline}
              disabled={toggleOnlineMutation.isPending}
              className={`w-16 h-8 rounded-full transition-colors ${
                isOnline 
                  ? "bg-driver-primary hover:bg-driver-primary/90" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              data-testid="online-toggle"
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                isOnline ? "translate-x-2" : "-translate-x-2"
              } ${toggleOnlineMutation.isPending ? 'animate-pulse' : ''}`}></div>
            </Button>
          </div>

          {/* Driver Profile Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{driverProfile.vehicleModel}</p>
                <p className="text-sm text-gray-600">{driverProfile.vehicleNumber}</p>
                <p className="text-xs text-gray-500 capitalize">{driverProfile.vehicleType}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium ml-1">{user.rating || '5.0'}</span>
                </div>
                <p className="text-xs text-gray-500">{user.totalTrips || 0} total trips</p>
              </div>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900" data-testid="stats-trips">{stats.trips}</p>
              <p className="text-sm text-gray-600">Today's Trips</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900" data-testid="stats-hours">{stats.hours}</p>
              <p className="text-sm text-gray-600">Hours</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-driver-primary" data-testid="stats-earnings">{stats.earnings}</p>
              <p className="text-sm text-gray-600">Today's Earned</p>
            </div>
          </div>

          {/* Recent Trips */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900" data-testid="recent-trips-title">Recent trips</h3>
            <div className="space-y-3">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="bg-gray-50 rounded-lg p-4" data-testid={`trip-${trip.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900" data-testid={`trip-route-${trip.id}`}>
                        {trip.from} → {trip.to}
                      </p>
                      <p className="text-sm text-gray-600" data-testid={`trip-details-${trip.id}`}>
                        {trip.distance} • {trip.duration}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`trip-time-${trip.id}`}>
                        {trip.timeAgo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900" data-testid={`trip-fare-${trip.id}`}>
                        {trip.fare}
                      </p>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1" data-testid={`trip-rating-${trip.id}`}>
                          {trip.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Summary */}
          <Button
            className="w-full bg-driver-primary text-white py-4 rounded-xl font-semibold hover:bg-driver-primary/90"
            onClick={handleViewEarnings}
            data-testid="view-earnings-button"
          >
            View Detailed Earnings
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
