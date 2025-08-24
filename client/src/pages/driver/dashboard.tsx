import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Navigation, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationSearch } from "@/hooks/use-location-search";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { RideWithDetails } from "@shared/schema";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Enhanced geolocation tracking for drivers
  const geolocation = useGeolocation({ 
    watch: isOnline, // Only track location when online
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 5000
  });
  const locationSearch = useLocationSearch();

  // Check for pending ride requests
  const { data: pendingRides } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/ride-requests'],
    queryFn: async () => {
      const response = await fetch('/api/ride-requests');
      return response.json();
    },
    refetchInterval: isOnline ? 5000 : false,
  });

  // Check for active ride
  const { data: activeRide } = useQuery<RideWithDetails | null>({
    queryKey: ['/api/drivers/driver-1/active-ride'],
    queryFn: async () => {
      const response = await fetch('/api/drivers/driver-1/active-ride');
      return response.json();
    },
    refetchInterval: 3000,
  });

  // Update driver location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (locationData: { lat: number; lng: number; heading?: number; speed?: number }) => {
      return apiRequest('/api/drivers/driver-1', 'PUT', {
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
      return apiRequest('/api/drivers/driver-1', 'PUT', {
        isOnline: online,
        ...(geolocation.latitude && geolocation.longitude && {
          currentLat: geolocation.latitude.toString(),
          currentLng: geolocation.longitude.toString(),
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
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

  // Show ride request if there's a pending one
  useEffect(() => {
    if (pendingRides && pendingRides.length > 0 && isOnline) {
      setLocation(`/driver/ride-request/${pendingRides[0].id}`);
    }
  }, [pendingRides, isOnline, setLocation]);

  const handleModeSwitch = () => {
    setLocation("/rider");
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
    // Navigate to earnings page (not implemented)
  };

  // Mock stats data
  const stats = {
    trips: 8,
    hours: "6.2h",
    earnings: "₹1,247"
  };

  const recentTrips = [
    {
      id: "1",
      from: "Downtown",
      to: "Airport",
      distance: "12.4 km",
      duration: "35 min",
      timeAgo: "2 hours ago",
      fare: "₹186",
      rating: 5.0
    },
    {
      id: "2",
      from: "Mall",
      to: "Home",
      distance: "8.2 km",
      duration: "22 min",
      timeAgo: "3 hours ago",
      fare: "₹124",
      rating: 4.8
    }
  ];

  return (
    <>
      <Header
        title="Driver Dashboard"
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

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900" data-testid="stats-trips">{stats.trips}</p>
              <p className="text-sm text-gray-600">Trips</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900" data-testid="stats-hours">{stats.hours}</p>
              <p className="text-sm text-gray-600">Hours</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-driver-primary" data-testid="stats-earnings">{stats.earnings}</p>
              <p className="text-sm text-gray-600">Earned</p>
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
