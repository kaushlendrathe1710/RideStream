import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Truck, Check, Clock, MapPin, Users, IndianRupee, Zap, Shield, Star, Bike } from "lucide-react";
import { vehicleTypes, calculateDistance, calculateDuration } from "@/lib/mock-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { DriverWithUser } from "@shared/schema";

export default function RiderBooking() {
  const [, setLocation] = useLocation();
  const [selectedVehicle, setSelectedVehicle] = useState("mini");
  const [step, setStep] = useState<"selection" | "matching" | "driver_found">("selection");
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverWithUser[]>([]);
  const [assignedDriver, setAssignedDriver] = useState<DriverWithUser | null>(null);
  const [fareEstimate, setFareEstimate] = useState<any>(null);
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

  // Enhanced vehicle types with Indian market focus
  const enhancedVehicleTypes = [
    {
      id: 'mini',
      name: 'Ride Mini',
      description: 'Affordable rides',
      icon: Car,
      capacity: '4 seats',
      baseRate: 8,
      perKmRate: 12,
      features: ['AC', 'Music'],
      eta: '2-5 min',
      color: 'bg-blue-500',
      savings: 'Most affordable'
    },
    {
      id: 'sedan',
      name: 'Ride Sedan',
      description: 'Comfortable rides',
      icon: Car,
      capacity: '4 seats',
      baseRate: 15,
      perKmRate: 18,
      features: ['AC', 'Music', 'Premium'],
      eta: '3-7 min',
      color: 'bg-green-500',
      savings: null
    },
    {
      id: 'suv',
      name: 'Ride SUV',
      description: 'Spacious & premium',
      icon: Truck,
      capacity: '6-7 seats',
      baseRate: 25,
      perKmRate: 28,
      features: ['AC', 'Music', 'Premium', 'Extra Space'],
      eta: '5-10 min',
      color: 'bg-purple-500',
      savings: null
    },
    {
      id: 'auto',
      name: 'Auto Rickshaw',
      description: 'Quick & economical',
      icon: Bike,
      capacity: '3 seats',
      baseRate: 5,
      perKmRate: 8,
      features: ['Open Air', 'Quick'],
      eta: '1-3 min',
      color: 'bg-yellow-500',
      savings: 'Save ₹15'
    }
  ];

  // Calculate dynamic fare estimation
  useEffect(() => {
    if (distance > 0) {
      const selectedVehicleType = enhancedVehicleTypes.find(v => v.id === selectedVehicle);
      if (selectedVehicleType) {
        const baseFare = selectedVehicleType.baseRate;
        const distanceFare = distance * selectedVehicleType.perKmRate;
        const surge = 1.0; // Normal pricing
        const total = Math.round((baseFare + distanceFare) * surge);
        const taxes = Math.round(total * 0.05);
        
        setFareEstimate({
          baseFare,
          distanceFare: Math.round(distanceFare),
          surgeFare: 0,
          total,
          surge,
          breakdown: {
            base: baseFare,
            distance: Math.round(distanceFare),
            taxes,
            finalTotal: total + taxes
          }
        });
      }
    }
  }, [selectedVehicle, distance]);

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

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900" data-testid="choose-vehicle-title">Choose Vehicle</h2>
              <p className="text-gray-500" data-testid="trip-distance">{distance.toFixed(1)} km • {duration} min ride</p>
            </div>
            <Badge variant="outline" className="text-green-600">
              <Zap className="w-3 w-3 mr-1" />
              Normal pricing
            </Badge>
          </div>

          {/* Enhanced Vehicle Options */}
          <div className="space-y-3 mb-6">
            {enhancedVehicleTypes.map((vehicle) => {
              const driversForVehicle = availableDrivers.filter(d => d.vehicleType === vehicle.id);
              const isAvailable = driversForVehicle.length > 0;
              const isSelected = selectedVehicle === vehicle.id;
              
              // Calculate fare for this vehicle
              const vehicleFare = Math.round(vehicle.baseRate + (distance * vehicle.perKmRate));
              const taxes = Math.round(vehicleFare * 0.05);
              const totalFare = vehicleFare + taxes;
              
              return (
                <div
                  key={vehicle.id}
                  onClick={() => isAvailable && setSelectedVehicle(vehicle.id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rider-primary bg-rider-primary/5 shadow-md'
                      : isAvailable
                        ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  data-testid={`vehicle-${vehicle.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-rider-primary text-white' : vehicle.color + ' text-white'
                      }`}>
                        <vehicle.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900" data-testid={`vehicle-name-${vehicle.id}`}>
                            {vehicle.name}
                          </h3>
                          {isSelected && <Check className="w-4 h-4 text-rider-primary" />}
                          {vehicle.savings && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              {vehicle.savings}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{vehicle.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {vehicle.capacity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {vehicle.eta}
                          </Badge>
                          {driversForVehicle.length > 0 ? (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              {driversForVehicle.length} available
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-gray-100 text-gray-600">
                              Limited
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          {vehicle.features.map((feature, index) => (
                            <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <IndianRupee className="w-4 h-4 text-gray-600" />
                        <span className="font-bold text-lg text-gray-900" data-testid={`vehicle-price-${vehicle.id}`}>
                          {isSelected && fareEstimate ? fareEstimate.breakdown.finalTotal : totalFare}
                        </span>
                      </div>
                      {isSelected && fareEstimate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Base ₹{fareEstimate.baseFare} + ₹{fareEstimate.breakdown.distance}
                        </p>
                      )}
                      <div className="flex items-center mt-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1">4.8</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Price Breakdown */}
          {fareEstimate && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <IndianRupee className="w-4 h-4 mr-1" />
                Fare Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base fare</span>
                  <span>₹{fareEstimate.breakdown.base}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance ({distance.toFixed(1)} km)</span>
                  <span>₹{fareEstimate.breakdown.distance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes & fees</span>
                  <span>₹{fareEstimate.breakdown.taxes}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{fareEstimate.breakdown.finalTotal}</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded flex items-center">
                <Shield className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-xs text-blue-800">Price includes GST • No hidden charges</span>
              </div>
            </div>
          )}

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
