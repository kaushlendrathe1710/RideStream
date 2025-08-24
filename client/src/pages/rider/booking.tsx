import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Car, Truck, Check } from "lucide-react";
import { vehicleTypes, calculateDistance, calculateDuration } from "@/lib/mock-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RiderBooking() {
  const [, setLocation] = useLocation();
  const [selectedVehicle, setSelectedVehicle] = useState("sedan");
  const [step, setStep] = useState<"selection" | "matching">("selection");
  const { toast } = useToast();

  // Mock trip data
  const tripData = {
    pickup: { lat: 28.6139, lng: 77.2090, address: "Current Location" },
    dropoff: { lat: 28.6149, lng: 77.2085, address: "Central Mall, Sector 21" },
    distance: 3.2,
    duration: 12,
  };

  const { data: fareData } = useQuery({
    queryKey: ['/api/calculate-fare'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/calculate-fare', {
        distance: tripData.distance,
        vehicleType: selectedVehicle
      });
      return response.json();
    },
  });

  const bookRideMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/rides', {
        riderId: 'rider-1', // Mock rider ID
        pickupAddress: tripData.pickup.address,
        pickupLat: tripData.pickup.lat.toString(),
        pickupLng: tripData.pickup.lng.toString(),
        dropoffAddress: tripData.dropoff.address,
        dropoffLat: tripData.dropoff.lat.toString(),
        dropoffLng: tripData.dropoff.lng.toString(),
        vehicleType: selectedVehicle,
        fare: fareData?.total.toString(),
        distance: tripData.distance.toString(),
        duration: tripData.duration,
      });
      return response.json();
    },
    onSuccess: (ride) => {
      setStep("matching");
      
      // Simulate finding a driver after 3 seconds
      setTimeout(() => {
        // Update ride with driver
        apiRequest('PATCH', `/api/rides/${ride.id}`, {
          driverId: 'driver-1',
          status: 'driver_assigned'
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/rides', ride.id] });
          setLocation(`/rider/trip/${ride.id}`);
        });
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to book ride. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleModeSwitch = () => {
    setLocation("/driver");
  };

  const handleBackToLocation = () => {
    setLocation("/rider");
  };

  const handleBookRide = () => {
    bookRideMutation.mutate();
  };

  const handleCancelSearch = () => {
    setStep("selection");
  };

  if (step === "matching") {
    return (
      <>
        <Header
          title="Looking for Driver"
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
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-rider-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto">
                <div className="w-6 h-6 border-2 border-rider-primary border-t-transparent rounded-full animate-spin" data-testid="loading-spinner"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900" data-testid="matching-title">Looking for a driver</h2>
              <p className="text-gray-500" data-testid="matching-description">We're finding the best driver for you...</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancelSearch}
              data-testid="cancel-search-button"
            >
              Cancel
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600" data-testid="trip-distance">Distance: {tripData.distance} km</span>
              <span className="text-gray-600" data-testid="trip-duration">Time: {tripData.duration} min</span>
            </div>
          </div>

          {/* Vehicle Options */}
          <div className="space-y-3">
            {vehicleTypes.map((vehicle) => (
              <Button
                key={vehicle.id}
                variant="ghost"
                className={`w-full p-4 h-auto justify-between rounded-lg transition-all ${
                  selectedVehicle === vehicle.id
                    ? "border-2 border-rider-primary bg-rider-primary bg-opacity-5"
                    : "border border-gray-200 hover:border-rider-primary"
                }`}
                onClick={() => setSelectedVehicle(vehicle.id)}
                data-testid={`vehicle-${vehicle.id}`}
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
                    ₹{fareData ? (vehicle.id === selectedVehicle ? fareData.total : Math.round(vehicle.baseFare + tripData.distance * vehicle.perKm)) : vehicle.baseFare + Math.round(tripData.distance * vehicle.perKm)}
                  </p>
                  {selectedVehicle === vehicle.id && (
                    <div className="flex items-center space-x-1">
                      <Check className="text-xs text-rider-primary" />
                      <span className="text-xs text-rider-primary">Selected</span>
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>

          {/* Book Ride Button */}
          <Button
            className="w-full bg-rider-primary text-white py-4 rounded-xl font-semibold hover:bg-rider-primary/90"
            onClick={handleBookRide}
            disabled={bookRideMutation.isPending}
            data-testid="book-ride-button"
          >
            {bookRideMutation.isPending ? "Booking..." : `Book ${vehicleTypes.find(v => v.id === selectedVehicle)?.name}`}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
