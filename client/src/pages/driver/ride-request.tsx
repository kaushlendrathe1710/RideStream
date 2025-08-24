import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Star, Route } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RideWithDetails } from "@shared/schema";

export default function DriverRideRequest() {
  const { rideId } = useParams();
  const [, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState(15);
  const { toast } = useToast();

  const { data: ride, isLoading } = useQuery<RideWithDetails>({
    queryKey: ['/api/rides', rideId],
    queryFn: async () => {
      const response = await fetch(`/api/rides/${rideId}`);
      return response.json();
    },
  });

  const acceptRideMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/rides/${rideId}`, {
        driverId: 'driver-1',
        status: 'driver_assigned'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides', rideId] });
      setLocation(`/driver/trip/${rideId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept ride. Please try again.",
        variant: "destructive"
      });
    }
  });

  const declineRideMutation = useMutation({
    mutationFn: async () => {
      // In a real app, this would mark the driver as unavailable for this specific ride
      // For now, we'll just redirect back to dashboard
      return Promise.resolve();
    },
    onSuccess: () => {
      setLocation('/driver');
    },
  });

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto decline and redirect
      setLocation('/driver');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, setLocation]);

  const handleModeSwitch = () => {
    setLocation("/rider");
  };

  const handleAcceptRide = () => {
    acceptRideMutation.mutate();
  };

  const handleDeclineRide = () => {
    declineRideMutation.mutate();
  };

  if (isLoading || !ride) {
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
        currentLocation={{ lat: 28.6139, lng: 77.2090 }} // Driver location
        pickupLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
        dropoffLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
      />

      <BottomSheet>
        <div className="p-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900" data-testid="ride-request-title">New ride request</h2>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <div className="w-8 h-8 bg-driver-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-driver-primary font-bold text-sm" data-testid="timer-countdown">{timeLeft}</span>
              </div>
              <p className="text-gray-500" data-testid="timer-description">seconds to respond</p>
            </div>
          </div>

          {/* Ride Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {/* Customer Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" data-testid="rider-avatar">
                <span className="text-gray-600 text-sm font-medium">{ride.rider.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900" data-testid="rider-name">{ride.rider.name}</p>
                <div className="flex items-center space-x-2">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-600" data-testid="rider-rating">{ride.rider.rating}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-600" data-testid="pickup-distance">3.2 km away</span>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex flex-col items-center space-y-2 mt-1">
                  <div className="w-3 h-3 bg-driver-primary rounded-full"></div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="w-3 h-3 border-2 border-gray-400 rounded-full bg-white"></div>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="font-medium text-gray-900">Pickup</p>
                    <p className="text-sm text-gray-600" data-testid="pickup-address">{ride.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Drop-off</p>
                    <p className="text-sm text-gray-600" data-testid="dropoff-address">{ride.dropoffAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Info */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600" data-testid="trip-distance">
                  Distance: <span className="font-medium">{ride.distance} km</span>
                </span>
                <span className="text-gray-600" data-testid="trip-fare">
                  Fare: <span className="font-medium text-driver-primary">₹{ride.fare}</span>
                </span>
              </div>
            </div>
          </div>

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
