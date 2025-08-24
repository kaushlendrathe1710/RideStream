import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Star, Download, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RideWithDetails } from "@shared/schema";

export default function RiderTrip() {
  const { rideId } = useParams();
  const [, setLocation] = useLocation();
  const [rating, setRating] = useState(0);
  const { toast } = useToast();

  const { data: ride, isLoading } = useQuery<RideWithDetails>({
    queryKey: ['/api/rides', rideId],
    queryFn: async () => {
      const response = await fetch(`/api/rides/${rideId}`);
      return response.json();
    },
    refetchInterval: ride?.status === 'in_progress' ? 5000 : false,
  });

  const cancelRideMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/rides/${rideId}`, {
        status: 'cancelled'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ride Cancelled",
        description: "Your ride has been cancelled successfully."
      });
      setLocation('/rider');
    },
  });

  const handleModeSwitch = () => {
    setLocation("/driver");
  };

  const handleCancelRide = () => {
    cancelRideMutation.mutate();
  };

  const handleCallDriver = () => {
    toast({
      title: "Calling Driver",
      description: `Calling ${ride?.driver?.user.name}...`
    });
  };

  const handleMessageDriver = () => {
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the driver."
    });
  };

  const handleEmergency = () => {
    toast({
      title: "Emergency Alert",
      description: "Emergency services have been notified.",
      variant: "destructive"
    });
  };

  const handleRateDriver = (newRating: number) => {
    setRating(newRating);
  };

  const handleBookAnother = () => {
    setLocation('/rider');
  };

  const handleDownloadInvoice = () => {
    toast({
      title: "Invoice Downloaded",
      description: "Your invoice has been downloaded successfully."
    });
  };

  if (isLoading || !ride) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-rider-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner"></div>
      </div>
    );
  }

  // Driver Found / Driver on the way
  if (ride.status === 'driver_assigned') {
    return (
      <>
        <Header
          title="Driver on the way"
          mode="rider"
          onModeSwitch={handleModeSwitch}
        />

        <Map
          currentLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
          pickupLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
          dropoffLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
          showDriverMarkers
        />

        <BottomSheet>
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="driver-arriving-title">Driver on the way</h2>
              <p className="text-gray-500" data-testid="driver-eta">Arriving in 3 min</p>
            </div>

            {/* Driver Info Card */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center" data-testid="driver-avatar">
                  <span className="text-gray-600 font-medium">{ride.driver?.user.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900" data-testid="driver-name">{ride.driver?.user.name}</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1" data-testid="driver-rating">{ride.driver?.user.rating}</span>
                    </div>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-600" data-testid="driver-trips">{ride.driver?.user.totalTrips} trips</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCallDriver}
                    data-testid="call-driver-button"
                  >
                    <Phone className="w-4 h-4 text-rider-primary" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMessageDriver}
                    data-testid="message-driver-button"
                  >
                    <MessageCircle className="w-4 h-4 text-rider-primary" />
                  </Button>
                </div>
              </div>
              
              {/* Vehicle Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900" data-testid="vehicle-model">{ride.driver?.vehicleModel}</p>
                    <p className="text-sm text-gray-600" data-testid="vehicle-number">{ride.driver?.vehicleNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">OTP</p>
                    <p className="font-semibold text-lg" data-testid="trip-otp">{ride.otp}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <p className="text-sm text-blue-800" data-testid="otp-instruction">Share the OTP with your driver to start the trip</p>
              </div>
            </div>

            {/* Cancel Ride Button */}
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleCancelRide}
              disabled={cancelRideMutation.isPending}
              data-testid="cancel-ride-button"
            >
              {cancelRideMutation.isPending ? "Cancelling..." : "Cancel Ride"}
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  }

  // Trip in progress
  if (ride.status === 'in_progress') {
    return (
      <>
        <Header
          title="Trip in progress"
          mode="rider"
          onModeSwitch={handleModeSwitch}
        />

        <Map
          currentLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
          pickupLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
          dropoffLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
        />

        <BottomSheet>
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="trip-progress-title">Trip in progress</h2>
              <p className="text-gray-500" data-testid="estimated-arrival">Estimated arrival: {ride.duration} min</p>
            </div>

            {/* Trip Progress Bar */}
            <div className="bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-rider-primary h-2 rounded-full w-1/3 transition-all duration-1000" data-testid="progress-bar"></div>
            </div>

            {/* Driver Info (Compact) */}
            <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" data-testid="driver-avatar-compact">
                <span className="text-gray-600 text-sm font-medium">{ride.driver?.user.name.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900" data-testid="driver-name-compact">{ride.driver?.user.name}</p>
                <p className="text-sm text-gray-600" data-testid="vehicle-number-compact">{ride.driver?.vehicleNumber}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCallDriver}
                  data-testid="call-driver-compact"
                >
                  <Phone className="w-4 h-4 text-rider-primary" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMessageDriver}
                  data-testid="message-driver-compact"
                >
                  <MessageCircle className="w-4 h-4 text-rider-primary" />
                </Button>
              </div>
            </div>

            {/* SOS Button */}
            <Button
              className="w-full bg-red-600 text-white hover:bg-red-700"
              onClick={handleEmergency}
              data-testid="emergency-button"
            >
              <Shield className="w-4 h-4 mr-2" />
              Emergency
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  }

  // Trip completed
  if (ride.status === 'completed') {
    const fareBreakdown = {
      base: 35,
      distance: Math.round(parseFloat(ride.distance || "0") * 20),
      time: Math.round((ride.duration || 0) * 1.5),
      tax: 7,
      total: parseInt(ride.fare || "124")
    };

    return (
      <>
        <Header
          title="Trip Completed"
          mode="rider"
          onModeSwitch={handleModeSwitch}
        />

        <Map
          currentLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
          pickupLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
          dropoffLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
        />

        <BottomSheet>
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rider-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 text-rider-primary">✓</div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900" data-testid="trip-completed-title">Trip completed</h2>
              <p className="text-gray-500" data-testid="trip-completed-subtitle">Hope you had a great ride!</p>
            </div>

            {/* Trip Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900" data-testid="trip-summary-title">Trip Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base fare</span>
                  <span className="text-gray-900" data-testid="fare-base">₹{fareBreakdown.base}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance ({ride.distance} km)</span>
                  <span className="text-gray-900" data-testid="fare-distance">₹{fareBreakdown.distance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time ({ride.duration} min)</span>
                  <span className="text-gray-900" data-testid="fare-time">₹{fareBreakdown.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST</span>
                  <span className="text-gray-900" data-testid="fare-tax">₹{fareBreakdown.tax}</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900" data-testid="fare-total">₹{fareBreakdown.total}</span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-gray-900" data-testid="rate-driver-title">Rate your driver</h3>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRateDriver(star)}
                    data-testid={`star-${star}`}
                  >
                    <Star 
                      className={`w-6 h-6 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                    />
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-rider-primary text-white py-4 rounded-xl font-semibold hover:bg-rider-primary/90"
                onClick={handleBookAnother}
                data-testid="book-another-ride-button"
              >
                Book Another Ride
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadInvoice}
                data-testid="download-invoice-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
            </div>
          </div>
        </BottomSheet>
      </>
    );
  }

  return null;
}
