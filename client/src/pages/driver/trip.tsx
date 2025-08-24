import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, MessageCircle, Clock, Navigation, MapPin, Route, Compass, Car, ArrowRight, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { RideWithDetails } from "@shared/schema";

export default function DriverTrip() {
  const { rideId } = useParams();
  const [, setLocation] = useLocation();
  const [waitingTime, setWaitingTime] = useState(0);
  const [navigationData, setNavigationData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const geolocation = useGeolocation({ 
    watch: true,
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 5000
  });

  const { data: ride, isLoading } = useQuery<RideWithDetails>({
    queryKey: ['/api/rides', rideId],
    queryFn: async () => {
      const response = await fetch(`/api/rides/${rideId}`);
      return response.json();
    },
    refetchInterval: 3000, // More frequent updates for drivers
  });

  // Fetch navigation route
  const { data: routeData } = useQuery({
    queryKey: ['/api/navigation/route', ride?.pickupLat, ride?.dropoffLat],
    queryFn: async () => {
      if (!ride) return null;
      const origin = { lat: geolocation.latitude || 28.6139, lng: geolocation.longitude || 77.2090 };
      const destination = ride.status === 'driver_assigned' 
        ? { lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }
        : { lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) };
      
      const response = await fetch('/api/navigation/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination })
      });
      return response.json();
    },
    enabled: !!ride && !!geolocation.latitude,
    refetchInterval: 30000 // Update route every 30 seconds
  });

  // Update driver location continuously
  useEffect(() => {
    if (geolocation.latitude && geolocation.longitude && rideId && ride) {
      fetch(`/api/rides/${rideId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: geolocation.latitude,
          lng: geolocation.longitude,
          heading: geolocation.heading,
          speed: geolocation.speed,
          userType: 'driver',
          timestamp: Date.now()
        })
      }).catch(() => {}); // Silent fail for location updates
    }
  }, [geolocation.latitude, geolocation.longitude, geolocation.heading, geolocation.speed, rideId, ride]);

  // Set navigation data from route
  useEffect(() => {
    if (routeData) {
      setNavigationData(routeData);
      setCurrentStep(0);
    }
  }, [routeData]);

  // Timer for waiting at pickup
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (ride?.status === 'driver_arrived') {
      interval = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);
    } else {
      setWaitingTime(0);
    }
    return () => clearInterval(interval);
  }, [ride?.status]);

  const updateRideStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const updateData: any = { status };
      
      if (status === 'in_progress') {
        updateData.startedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }
      
      const response = await apiRequest('PATCH', `/api/rides/${rideId}`, updateData);
      return response.json();
    },
    onSuccess: (updatedRide) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides', rideId] });
      
      if (updatedRide.status === 'completed') {
        // Auto-redirect to dashboard after 5 seconds
        setTimeout(() => {
          setLocation('/driver');
        }, 5000);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ride status. Please try again.",
        variant: "destructive"
      });
    }
  });

  const cancelTripMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/rides/${rideId}`, {
        status: 'cancelled'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trip Cancelled",
        description: "The trip has been cancelled successfully."
      });
      setLocation('/driver');
    },
  });

  const handleModeSwitch = () => {
    setLocation("/rider");
  };

  const handleCallRider = () => {
    toast({
      title: "Calling Rider",
      description: `Calling ${ride?.rider.name}...`
    });
  };

  const handleMessageRider = () => {
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the rider."
    });
  };

  const handleArrivedAtPickup = () => {
    updateRideStatusMutation.mutate('driver_arrived');
  };

  const handleStartTrip = () => {
    updateRideStatusMutation.mutate('in_progress');
  };

  const handleEndTrip = () => {
    updateRideStatusMutation.mutate('completed');
  };

  const handleCancelTrip = () => {
    cancelTripMutation.mutate();
  };

  const handleBackToDashboard = () => {
    setLocation('/driver');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading || !ride) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-driver-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner"></div>
      </div>
    );
  }

  // Going to pickup location
  if (ride.status === 'driver_assigned') {
    return (
      <>
        <Header
          title="Going to pickup"
          mode="driver"
          onModeSwitch={handleModeSwitch}
        />

        <Map
          currentLocation={geolocation.latitude && geolocation.longitude ? 
            { lat: geolocation.latitude, lng: geolocation.longitude } :
            { lat: 28.6139, lng: 77.2090 }
          }
          pickupLocation={{ lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng) }}
          dropoffLocation={{ lat: parseFloat(ride.dropoffLat), lng: parseFloat(ride.dropoffLng) }}
          driverLocation={geolocation.latitude && geolocation.longitude ? {
            lat: geolocation.latitude,
            lng: geolocation.longitude,
            heading: geolocation.heading,
            speed: geolocation.speed
          } : undefined}
          showRoute={true}
          routePolyline={navigationData?.polyline}
        />

        <BottomSheet>
          <div className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="going-to-pickup-title">Going to pickup</h2>
              <p className="text-gray-500" data-testid="pickup-eta">
                ETA: {navigationData?.duration?.text || 'Calculating...'}
              </p>
              <div className="flex items-center justify-center space-x-4 mt-2">
                <Badge variant="outline" className="text-blue-600">
                  <Route className="h-3 w-3 mr-1" />
                  {navigationData?.distance?.text || 'Loading...'}
                </Badge>
                {geolocation.speed && (
                  <Badge variant="outline" className="text-green-600">
                    <Car className="h-3 w-3 mr-1" />
                    {Math.round(geolocation.speed)} km/h
                  </Badge>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" data-testid="rider-avatar">
                    <span className="text-gray-600 text-sm font-medium">{ride.rider.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900" data-testid="rider-name">{ride.rider.name}</p>
                    <p className="text-sm text-gray-600" data-testid="trip-otp">OTP: <span className="font-semibold">{ride.otp}</span></p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCallRider}
                    data-testid="call-rider-button"
                  >
                    <Phone className="w-4 h-4 text-driver-primary" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMessageRider}
                    data-testid="message-rider-button"
                  >
                    <MessageCircle className="w-4 h-4 text-driver-primary" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Navigation */}
            {navigationData?.steps && (
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Compass className="h-4 w-4 text-blue-600" />
                    <span>Navigation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {navigationData.steps.slice(currentStep, currentStep + 2).map((step: any, index: number) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
                        }`}>
                          {step.maneuver === 'turn-left' ? '↰' : 
                           step.maneuver === 'turn-right' ? '↱' : 
                           step.maneuver === 'straight' ? '↑' : '→'}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            index === 0 ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {step.instruction}
                          </p>
                          <p className={`text-sm ${
                            index === 0 ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {step.distance} • {step.duration}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {navigationData.steps.length > 2 && (
                    <div className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setCurrentStep(Math.min(currentStep + 1, navigationData.steps.length - 2))}
                        disabled={currentStep >= navigationData.steps.length - 2}
                      >
                        Next Steps <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Location Status */}
            <Alert className="mb-4">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                {geolocation.latitude ? (
                  <>GPS connected • Accuracy: {geolocation.accuracy ? Math.round(geolocation.accuracy) : 'Unknown'}m</>
                ) : (
                  <>GPS locating... Please ensure location is enabled</>
                )}
              </AlertDescription>
            </Alert>

            {/* Arrived Button */}
            <Button
              className="w-full bg-driver-primary text-white py-4 rounded-xl font-semibold hover:bg-driver-primary/90"
              onClick={handleArrivedAtPickup}
              disabled={updateRideStatusMutation.isPending}
              data-testid="arrived-button"
            >
              {updateRideStatusMutation.isPending ? "Updating..." : "I've Arrived"}
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  }

  // At pickup location - waiting for rider
  if (ride.status === 'driver_arrived') {
    return (
      <>
        <Header
          title="Waiting for rider"
          mode="driver"
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
              <h2 className="text-xl font-semibold text-gray-900" data-testid="waiting-title">Waiting for rider</h2>
              <p className="text-gray-500" data-testid="waiting-subtitle">You've arrived at pickup location</p>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" data-testid="rider-avatar-waiting">
                    <span className="text-gray-600 text-sm font-medium">{ride.rider.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900" data-testid="rider-name-waiting">{ride.rider.name}</p>
                    <p className="text-sm text-gray-600" data-testid="otp-verification">Verify OTP: <span className="font-semibold">{ride.otp}</span></p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCallRider}
                    data-testid="call-rider-waiting"
                  >
                    <Phone className="w-4 h-4 text-driver-primary" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMessageRider}
                    data-testid="message-rider-waiting"
                  >
                    <MessageCircle className="w-4 h-4 text-driver-primary" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Waiting Timer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-800" data-testid="waiting-timer">
                  Waiting time: <span className="font-semibold">{formatTime(waitingTime)}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-driver-primary text-white py-4 rounded-xl font-semibold hover:bg-driver-primary/90"
                onClick={handleStartTrip}
                disabled={updateRideStatusMutation.isPending}
                data-testid="start-trip-button"
              >
                {updateRideStatusMutation.isPending ? "Starting..." : "Start Trip"}
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleCancelTrip}
                disabled={cancelTripMutation.isPending}
                data-testid="cancel-trip-button"
              >
                {cancelTripMutation.isPending ? "Cancelling..." : "Cancel Trip"}
              </Button>
            </div>
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
          mode="driver"
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
              <p className="text-gray-500" data-testid="gps-instruction">Follow GPS to destination</p>
            </div>

            {/* Trip Progress */}
            <div className="bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-driver-primary h-2 rounded-full w-2/3 transition-all duration-1000" data-testid="trip-progress-bar"></div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" data-testid="rider-avatar-progress">
                    <span className="text-gray-600 text-sm font-medium">{ride.rider.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900" data-testid="rider-name-progress">{ride.rider.name}</p>
                    <p className="text-sm text-gray-600" data-testid="destination-info">Going to {ride.dropoffAddress}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCallRider}
                    data-testid="call-rider-progress"
                  >
                    <Phone className="w-4 h-4 text-driver-primary" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMessageRider}
                    data-testid="message-rider-progress"
                  >
                    <MessageCircle className="w-4 h-4 text-driver-primary" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">Distance left</p>
                <p className="font-semibold text-gray-900" data-testid="distance-remaining">
                  {Math.max(0, parseFloat(ride.distance || "0") * 0.6).toFixed(1)} km
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-600">ETA</p>
                <p className="font-semibold text-gray-900" data-testid="eta-remaining">
                  {Math.max(5, Math.round((ride.duration || 0) * 0.6))} min
                </p>
              </div>
            </div>

            {/* End Trip Button */}
            <Button
              className="w-full bg-driver-primary text-white py-4 rounded-xl font-semibold hover:bg-driver-primary/90"
              onClick={handleEndTrip}
              disabled={updateRideStatusMutation.isPending}
              data-testid="end-trip-button"
            >
              {updateRideStatusMutation.isPending ? "Ending Trip..." : "End Trip"}
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  }

  // Trip completed
  if (ride.status === 'completed') {
    const commission = parseFloat(ride.fare || "0") * 0.1; // 10% commission
    const netEarning = parseFloat(ride.fare || "0") - commission;

    return (
      <>
        <Header
          title="Trip Completed"
          mode="driver"
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
              <div className="w-16 h-16 bg-driver-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 text-driver-primary text-xl">✓</div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900" data-testid="trip-completed-title">Trip completed</h2>
              <p className="text-gray-500" data-testid="trip-completed-subtitle">Great job! Payment received</p>
            </div>

            {/* Earnings */}
            <div className="bg-driver-primary bg-opacity-10 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">You earned</p>
              <p className="text-3xl font-bold text-driver-primary" data-testid="trip-earnings">₹{ride.fare}</p>
              <p className="text-sm text-gray-600" data-testid="earnings-breakdown">
                Commission: <span>₹{commission.toFixed(1)}</span> • Net: <span>₹{netEarning.toFixed(1)}</span>
              </p>
            </div>

            {/* Customer Rating */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" data-testid="rider-avatar-completed">
                  <span className="text-gray-600 text-sm font-medium">{ride.rider.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900" data-testid="rider-name-completed">{ride.rider.name}</p>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-600">Rated you:</span>
                    <div className="flex space-x-1" data-testid="rider-rating-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="w-3 h-3 text-yellow-400">★</div>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900" data-testid="rating-value">5.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              className="w-full bg-driver-primary text-white py-4 rounded-xl font-semibold hover:bg-driver-primary/90"
              onClick={handleBackToDashboard}
              data-testid="continue-driving-button"
            >
              Continue Driving
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  }

  return null;
}
