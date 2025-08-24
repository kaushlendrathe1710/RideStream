import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Route, MapPin, DollarSign, Clock, Navigation, Users, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance, calculateDuration } from "@/lib/mock-data";
import type { RideWithDetails, Driver } from "@shared/schema";

export default function DriverRideRequest() {
  const { rideId } = useParams();
  const [, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState(30); // Increased to 30 seconds
  const { toast } = useToast();
  const geolocation = useGeolocation();
  
  // Get current user and driver profile
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
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

  const { data: ride, isLoading } = useQuery<RideWithDetails>({
    queryKey: ['/api/rides', rideId],
    queryFn: async () => {
      const response = await fetch(`/api/rides/${rideId}`);
      return response.json();
    },
  });

  const acceptRideMutation = useMutation({
    mutationFn: async () => {
      if (!driverProfile?.id) {
        throw new Error('No driver profile found');
      }
      
      const response = await fetch(`/api/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driverProfile.id,
          status: 'driver_assigned'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to accept ride');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides', rideId] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers', driverProfile?.id, 'ride-requests'] });
      toast({
        title: "Ride Accepted! 🎉",
        description: "You've successfully accepted the ride. Navigate to pickup location.",
      });
      setLocation(`/driver/trip/${rideId}`);
    },
    onError: (error) => {
      console.error('Accept ride error:', error);
      toast({
        title: "Failed to Accept",
        description: "This ride may have been taken by another driver.",
        variant: "destructive"
      });
      setLocation('/driver');
    }
  });

  const declineRideMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would mark the driver as unavailable for this specific ride
      // For now, we'll just redirect back to dashboard
      toast({
        title: "Ride Declined",
        description: "Looking for other ride requests...",
      });
      return Promise.resolve();
    },
    onSuccess: () => {
      setLocation('/driver');
    },
  });

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      toast({
        title: "Request Expired",
        description: "The ride request has expired and was offered to another driver.",
        variant: "destructive"
      });
      setLocation('/driver');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, setLocation, toast]);
  
  // Calculate distance and earnings
  const distance = ride ? calculateDistance(
    geolocation.latitude || 28.6139,
    geolocation.longitude || 77.2090,
    parseFloat(ride.pickupLat),
    parseFloat(ride.pickupLng)
  ) : 0;
  
  const tripDistance = ride ? parseFloat(ride.distance || '0') : 0;
  const estimatedEarnings = ride ? {
    fare: parseFloat(ride.fare || '0'),
    commission: parseFloat(ride.fare || '0') * 0.2, // 20% platform commission
    driverEarnings: parseFloat(ride.fare || '0') * 0.8, // 80% to driver
    bonus: distance < 2 ? 5 : 0 // ₹5 bonus for nearby pickups
  } : null;
  
  const totalEarnings = estimatedEarnings ? 
    estimatedEarnings.driverEarnings + estimatedEarnings.bonus : 0;

  const handleModeSwitch = () => {
    setLocation("/rider");
  };

  const handleAcceptRide = () => {
    acceptRideMutation.mutate();
  };

  const handleDeclineRide = () => {
    declineRideMutation.mutate();
  };

  if (isLoading || !ride || !driverProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-driver-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner"></div>
      </div>
    );
  }

  // If ride is no longer available (already accepted by another driver)
  if (ride.status !== 'searching') {
    setLocation('/driver');
    return null;
  }

  return (
    <>
      <Header
        title="New Ride Request"
        mode="driver"
        onModeSwitch={handleModeSwitch}
      />

      <Map
        currentLocation={{
          lat: geolocation.latitude || 28.6139,
          lng: geolocation.longitude || 77.2090
        }}
        pickupLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
        dropoffLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
        showDriverMarkers
      />

      <BottomSheet>
        <div className="p-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900" data-testid="ride-request-title">New Ride Request</h2>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${timeLeft > 15 ? 'bg-green-100' : timeLeft > 10 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <span className={`font-bold text-sm ${timeLeft > 15 ? 'text-green-600' : timeLeft > 10 ? 'text-yellow-600' : 'text-red-600'}`} data-testid="timer-countdown">{timeLeft}</span>
              </div>
              <p className="text-gray-500" data-testid="timer-description">seconds to respond</p>
            </div>
          </div>
          
          {/* Earnings Preview */}
          {estimatedEarnings && (
            <Card className="mb-4 border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <DollarSign className="h-5 w-5" />
                  <span>Earnings Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">₹{totalEarnings.toFixed(0)}</p>
                    <p className="text-sm text-green-700">You'll Earn</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{distance.toFixed(1)}km</p>
                    <p className="text-sm text-gray-600">To Pickup</p>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-green-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Trip Fare:</span>
                    <span className="font-medium">₹{estimatedEarnings.fare.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee:</span>
                    <span className="text-red-600">-₹{estimatedEarnings.commission.toFixed(0)}</span>
                  </div>
                  {estimatedEarnings.bonus > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Nearby Bonus:</span>
                      <span className="text-green-600">+₹{estimatedEarnings.bonus}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-green-200">
                    <span>Your Earnings:</span>
                    <span className="text-green-600">₹{totalEarnings.toFixed(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ride Information */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Navigation className="h-5 w-5 text-blue-600" />
                <span>Trip Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{tripDistance.toFixed(1)}km</p>
                  <p className="text-sm text-gray-600">Distance</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{calculateDuration(tripDistance)}min</p>
                  <p className="text-sm text-gray-600">Duration</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{ride.vehicleType}</p>
                  <p className="text-sm text-gray-600">Vehicle</p>
                </div>
              </div>

              
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Pickup Location</p>
                      <p className="font-medium text-gray-900" data-testid="pickup-address">{ride.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Drop-off Location</p>
                      <p className="font-medium text-gray-900" data-testid="dropoff-address">{ride.dropoffAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passenger Information */}
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Users className="h-5 w-5" />
                <span>Passenger Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold text-lg">
                    {ride.rider?.name?.charAt(0) || 'R'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900" data-testid="rider-name">{ride.rider?.name || 'Rider'}</p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="text-sm text-gray-600" data-testid="rider-rating">{ride.rider?.rating || '4.8'}</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      OTP: {ride.otp}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              variant="outline"
              className="flex-1 py-4 font-semibold"
              onClick={handleDeclineRide}
              disabled={declineRideMutation.isPending}
              data-testid="decline-ride-button"
            >
              {declineRideMutation.isPending ? "Declining..." : "Decline"}
            </Button>
            <Button
              className="flex-1 bg-driver-primary text-white py-4 font-semibold hover:bg-driver-primary/90"
              onClick={handleAcceptRide}
              disabled={acceptRideMutation.isPending}
              data-testid="accept-ride-button"
            >
              {acceptRideMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
