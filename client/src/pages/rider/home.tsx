import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Briefcase } from "lucide-react";
import { mockLocations } from "@/lib/mock-data";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function RiderHome() {
  const [, setLocation] = useLocation();
  const [pickupAddress, setPickupAddress] = useState("Current Location");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const geolocation = useGeolocation();

  const handleModeSwitch = () => {
    setLocation("/driver");
  };

  const handleLocationSelect = (location: any) => {
    setDropoffAddress(location.address);
    setTimeout(() => {
      setLocation("/rider/booking");
    }, 500);
  };

  const handleManualDestination = () => {
    if (dropoffAddress.trim()) {
      setLocation("/rider/booking");
    }
  };

  return (
    <>
      <Header
        title="Book a Ride"
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4" data-testid="where-to-title">Where to?</h2>
          
          {/* Location Inputs */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-rider-primary rounded-full" data-testid="pickup-indicator"></div>
              <Input
                type="text"
                placeholder="Pickup location"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary"
                data-testid="pickup-input"
              />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 border-2 border-gray-400 rounded-full" data-testid="dropoff-indicator"></div>
              <Input
                type="text"
                placeholder="Where to?"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualDestination()}
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary"
                data-testid="dropoff-input"
              />
            </div>
          </div>

          {/* Quick Locations */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600" data-testid="recent-destinations-title">Recent destinations</h3>
            <div className="space-y-2">
              {mockLocations.slice(0, 2).map((location) => (
                <Button
                  key={location.id}
                  variant="ghost"
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg justify-start h-auto"
                  onClick={() => handleLocationSelect(location)}
                  data-testid={`location-${location.id}`}
                >
                  {location.icon === "home" ? (
                    <Home className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{location.name}</p>
                    <p className="text-sm text-gray-500">{location.address}</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
