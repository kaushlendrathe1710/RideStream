import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Truck, Check, Clock, MapPin, Users } from "lucide-react";
import { vehicleTypes, calculateDistance, calculateDuration } from "@/lib/mock-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { DriverWithUser } from "@shared/schema";

export default function RiderBooking() {
  const [, setLocation] = useLocation();
  const [selectedVehicle, setSelectedVehicle] = useState("sedan");
  const [step, setStep] = useState<"selection" | "matching" | "driver_found">("selection");
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverWithUser[]>([]);
  const [assignedDriver, setAssignedDriver] = useState<DriverWithUser | null>(null);
  const { toast } = useToast();
  const geolocation = useGeolocation();
  
  // Get current user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // Get trip data from localStorage (set from rider home page)
  const tripData = JSON.parse(localStorage.getItem('tripData') || 'null');
  
  // Redirect if no trip data or user
  useEffect(() => {
    if (!tripData || !user) {
      setLocation('/rider');
      return;
    }
  }, [tripData, user, setLocation]);
  
  // Calculate real distance and duration
  const distance = tripData ? calculateDistance(
    tripData.pickup.lat,
    tripData.pickup.lng,
    tripData.dropoff.lat,
    tripData.dropoff.lng
  ) : 0;
  
  const duration = calculateDuration(distance);

  // Fetch nearby drivers for selected vehicle type
  const { data: availableDrivers = [] } = useQuery<DriverWithUser[]>({
    queryKey: ['/api/drivers/nearby', tripData?.pickup.lat, tripData?.pickup.lng, selectedVehicle],
    queryFn: async () => {
      if (!tripData) return [];
      const response = await fetch(`/api/drivers/nearby?lat=${tripData.pickup.lat}&lng=${tripData.pickup.lng}&vehicleType=${selectedVehicle}&radius=10`);
      return response.json();
    },
    enabled: !!tripData,
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Calculate fare based on real distance
  const { data: fareData } = useQuery({
    queryKey: ['/api/calculate-fare', distance, selectedVehicle],
    queryFn: async () => {
      if (!distance) return null;
      const response = await fetch('/api/calculate-fare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance: distance,
          vehicleType: selectedVehicle
        })
      });
      return response.json();
    },
    enabled: !!distance,
  });

  const bookRideMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !tripData || !fareData) {
        throw new Error('Missing required data');
      }

      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: user.id,
          pickupAddress: tripData.pickup.address,
          pickupLat: tripData.pickup.lat.toString(),
          pickupLng: tripData.pickup.lng.toString(),
          dropoffAddress: tripData.dropoff.address,
          dropoffLat: tripData.dropoff.lat.toString(),
          dropoffLng: tripData.dropoff.lng.toString(),
          vehicleType: selectedVehicle,
          fare: fareData.total.toString(),
          distance: distance.toString(),
          duration: duration,
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create ride');
      }
      
      return response.json();
    },
    onSuccess: (ride) => {
      setStep("matching");
      
      // Find and assign the best available driver
      findBestDriver(ride.id);
    },
    onError: (error) => {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to book ride. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Real driver matching algorithm
  const findBestDriver = async (rideId: string) => {
    try {
      if (availableDrivers.length === 0) {
        toast({
          title: "No Drivers Available",
          description: "No drivers found nearby. Please try again.",
          variant: "destructive"
        });
        setStep("selection");
        return;
      }

      // Find the closest available driver
      const driversWithDistance = availableDrivers.map(driver => ({
        ...driver,
        distanceFromPickup: calculateDistance(
          parseFloat(driver.currentLat || '0'),
          parseFloat(driver.currentLng || '0'),
          tripData.pickup.lat,
          tripData.pickup.lng
        )
      }));

      // Sort by distance and rating
      const bestDriver = driversWithDistance.sort((a, b) => {
        const distanceDiff = a.distanceFromPickup - b.distanceFromPickup;
        if (Math.abs(distanceDiff) < 0.5) { // If distance is similar, prefer higher rated
          return parseFloat(b.user.rating || '0') - parseFloat(a.user.rating || '0');
        }
        return distanceDiff;
      })[0];

      // Assign driver to ride
      const response = await fetch(`/api/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: bestDriver.id,
          status: 'driver_assigned'
        })
      });

      if (response.ok) {
        setAssignedDriver(bestDriver);
        setStep("driver_found");
        
        // Auto-navigate to trip page after 3 seconds
        setTimeout(() => {
          localStorage.removeItem('tripData'); // Clean up
          setLocation(`/rider/trip/${rideId}`);
        }, 3000);
      } else {
        throw new Error('Failed to assign driver');
      }
    } catch (error) {
      console.error('Driver assignment error:', error);
      toast({
        title: "Driver Assignment Failed",
        description: "Could not assign a driver. Please try again.",
        variant: "destructive"
      });
      setStep("selection");
    }
  };

  const handleModeSwitch = () => {
    setLocation("/driver");
  };

  const handleBackToLocation = () => {
    localStorage.removeItem('tripData');
    setLocation("/rider");
  };

  const handleBookRide = () => {
    if (availableDrivers.length === 0) {
      toast({
        title: "No Drivers Available",
        description: "No drivers are available for this vehicle type in your area.",
        variant: "destructive"
      });
      return;
    }
    bookRideMutation.mutate();
  };

  const handleCancelSearch = () => {
    setStep("selection");
  };

  // Early return if no trip data
  if (!tripData || !user) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rider-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  // Driver Found Screen
  if (step === "driver_found" && assignedDriver) {
    return (
      <>
        <Header
          title="Driver Found!"
          mode="rider"
          onModeSwitch={handleModeSwitch}
        />

        <Map
          currentLocation={tripData.pickup}
          pickupLocation={tripData.pickup}
          dropoffLocation={tripData.dropoff}
          showDriverMarkers
        />

        <BottomSheet>
          <div className="p-6 space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Driver Assigned!</h2>
              <p className="text-gray-500">Your driver is on the way</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{assignedDriver.user.name}</p>
                  <p className="text-sm text-gray-600">{assignedDriver.vehicleModel} • {assignedDriver.vehicleNumber}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500">2-3 min away</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-yellow-500">★</span>
                      <span className="text-xs text-gray-500 ml-1">{assignedDriver.user.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500">
              Redirecting to trip details...
            </p>
          </div>
        </BottomSheet>
      </>
    );
  }

  // Driver Matching Screen
  if (step === "matching") {
    return (
      <>
        <Header
          title="Finding Driver"
          mode="rider"
          onModeSwitch={handleModeSwitch}
        />

        <Map
          currentLocation={tripData.pickup}
          pickupLocation={tripData.pickup}
          dropoffLocation={tripData.dropoff}
          showDriverMarkers
        />

        <BottomSheet>
          <div className="p-6 space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-rider-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto">
                <div className="w-6 h-6 border-2 border-rider-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900" data-testid="matching-title">Finding your driver</h2>
              <p className="text-gray-500" data-testid="matching-description">
                {availableDrivers.length > 0 
                  ? `${availableDrivers.length} drivers nearby`
                  : "Searching for drivers..."
                }
              </p>
            </div>

            {availableDrivers.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-800 text-center">
                  Matching you with the best driver...
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancelSearch}
              data-testid="cancel-search-button"
            >
              Cancel Search
            </Button>
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <>
      <Header
        title="Choose a Ride"
        mode="rider"
        onModeSwitch={handleModeSwitch}
      />

      <Map
        currentLocation={tripData.pickup}
        pickupLocation={tripData.pickup}
        dropoffLocation={tripData.dropoff}
      />

      <BottomSheet>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLocation}
              className="p-2"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900" data-testid="choose-ride-title">Choose a ride</h2>
            <div className="w-8"></div>
          </div>

          {/* Trip Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600" data-testid="trip-distance">Distance: {distance.toFixed(1)} km</span>
              <span className="text-gray-600" data-testid="trip-duration">Time: ~{duration} min</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600 truncate">{tripData.pickup.address}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-600 truncate">{tripData.dropoff.address}</span>
            </div>
          </div>

          {/* Available Drivers Info */}
          {availableDrivers.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {availableDrivers.length} driver{availableDrivers.length > 1 ? 's' : ''} nearby
                </span>
              </div>
            </div>
          )}

          {availableDrivers.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Limited drivers available
                </span>
              </div>
            </div>
          )}

          {/* Vehicle Options */}
          <div className="space-y-3">
            {vehicleTypes.map((vehicle) => {
              const driversForVehicle = availableDrivers.filter(d => d.vehicleType === vehicle.id);
              const isAvailable = driversForVehicle.length > 0;
              
              return (
              <Button
                key={vehicle.id}
                variant="ghost"
                className={`w-full p-4 h-auto justify-between rounded-lg transition-all ${
                  selectedVehicle === vehicle.id
                    ? "border-2 border-rider-primary bg-rider-primary bg-opacity-5"
                    : isAvailable 
                      ? "border border-gray-200 hover:border-rider-primary"
                      : "border border-gray-200 opacity-50 cursor-not-allowed"
                }`}
                onClick={() => isAvailable && setSelectedVehicle(vehicle.id)}
                data-testid={`vehicle-${vehicle.id}`}
                disabled={!isAvailable}
              >
                <div className="flex items-center space-x-3">
                  {vehicle.icon === "car" ? (
                    <Car className={`text-2xl ${selectedVehicle === vehicle.id ? "text-rider-primary" : "text-gray-400"}`} />
                  ) : (
                    <Truck className={`text-2xl ${selectedVehicle === vehicle.id ? "text-rider-primary" : "text-gray-400"}`} />
                  )}
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{vehicle.name}</h3>
                    <p className="text-sm text-gray-500">{vehicle.description}</p>
                    <p className="text-xs text-rider-primary">{vehicle.eta} away</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900" data-testid={`fare-${vehicle.id}`}>
                    ₹{vehicle.id === selectedVehicle && fareData ? fareData.total : Math.round(vehicle.baseFare + distance * vehicle.perKm)}
                  </p>
                  {vehicle.id === selectedVehicle && fareData && (
                    <p className="text-xs text-gray-500">
                      Base: ₹{fareData.baseFare} + Tax
                    </p>
                  )}
                  {selectedVehicle === vehicle.id && (
                    <div className="flex items-center space-x-1">
                      <Check className="text-xs text-rider-primary" />
                      <span className="text-xs text-rider-primary">Selected</span>
                    </div>
                  )}
                  {/* Show driver availability */}
                  <div className="mt-1">
                    {availableDrivers.filter(d => d.vehicleType === vehicle.id).length > 0 ? (
                      <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                        {availableDrivers.filter(d => d.vehicleType === vehicle.id).length} available
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-100">
                        Limited
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            );
            })}
          </div>

          {/* Book Ride Button */}
          <Button
            className="w-full bg-rider-primary text-white py-4 rounded-xl font-semibold hover:bg-rider-primary/90"
            onClick={handleBookRide}
            disabled={bookRideMutation.isPending || !fareData}
            data-testid="book-ride-button"
          >
            {bookRideMutation.isPending 
              ? "Booking..." 
              : fareData 
                ? `Book ${vehicleTypes.find(v => v.id === selectedVehicle)?.name} - ₹${fareData.total}`
                : "Calculating fare..."
            }
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
