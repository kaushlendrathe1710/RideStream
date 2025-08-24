import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Briefcase, MapPin, Navigation } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useLocationSearch } from "@/hooks/use-location-search";
import { useToast } from "@/hooks/use-toast";

export default function RiderHome() {
  const [, setLocation] = useLocation();
  const [pickupAddress, setPickupAddress] = useState("Current Location");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const { toast } = useToast();
  
  const geolocation = useGeolocation();
  const locationSearch = useLocationSearch();

  useEffect(() => {
    if (geolocation.latitude && geolocation.longitude && pickupAddress === "Current Location") {
      // Update pickup address when location is available
      locationSearch.reverseGeocode(geolocation.latitude, geolocation.longitude)
        .then(address => setPickupAddress(address))
        .catch(() => setPickupAddress(`${geolocation.latitude.toFixed(4)}, ${geolocation.longitude.toFixed(4)}`));
    }
  }, [geolocation.latitude, geolocation.longitude, pickupAddress, locationSearch]);

  const handleModeSwitch = () => {
    setLocation("/driver");
  };

  const handleLocationSelect = (location: any) => {
    setDropoffAddress(location.address);
    setShowLocationSearch(false);
    setTimeout(() => {
      setLocation("/rider/booking");
    }, 500);
  };

  const handleManualDestination = () => {
    if (dropoffAddress.trim()) {
      setLocation("/rider/booking");
    }
  };

  const handleGetCurrentLocation = () => {
    if (geolocation.loading) return;
    
    geolocation.getCurrentLocation();
    toast({
      title: "Getting location",
      description: "Fetching your current location..."
    });
  };

  const handleSearchLocation = async (query: string) => {
    if (query.length < 2) return;
    await locationSearch.searchLocations(query);
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900" data-testid="where-to-title">Where to?</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetCurrentLocation}
              disabled={geolocation.loading}
              data-testid="get-location-button"
            >
              <Navigation className={`h-4 w-4 ${geolocation.loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Location Status */}
          {geolocation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800" data-testid="location-error">{geolocation.error}</p>
            </div>
          )}

          {geolocation.accuracy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800" data-testid="location-accuracy">
                Location accuracy: {Math.round(geolocation.accuracy)}m
              </p>
            </div>
          )}
          
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                data-testid="use-current-location"
              >
                <MapPin className="h-4 w-4 text-rider-primary" />
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 border-2 border-gray-400 rounded-full" data-testid="dropoff-indicator"></div>
              <Input
                type="text"
                placeholder="Where to?"
                value={dropoffAddress}
                onChange={(e) => {
                  setDropoffAddress(e.target.value);
                  handleSearchLocation(e.target.value);
                  setShowLocationSearch(e.target.value.length > 0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleManualDestination()}
                className="flex-1 bg-gray-50 border-gray-200 focus:border-rider-primary"
                data-testid="dropoff-input"
              />
            </div>
          </div>

          {/* Search Results */}
          {showLocationSearch && locationSearch.suggestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600" data-testid="search-results-title">Search Results</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {locationSearch.suggestions.slice(0, 5).map((location) => (
                  <Button
                    key={location.id}
                    variant="ghost"
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg justify-start h-auto"
                    onClick={() => handleLocationSelect(location)}
                    data-testid={`search-result-${location.id}`}
                  >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Locations */}
          {!showLocationSearch && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600" data-testid="recent-destinations-title">Saved destinations</h3>
              <div className="space-y-2">
                {locationSearch.getSavedLocations().slice(0, 3).map((location) => (
                  <Button
                    key={location.id}
                    variant="ghost"
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg justify-start h-auto"
                    onClick={() => handleLocationSelect(location)}
                    data-testid={`location-${location.id}`}
                  >
                    {location.id === "home" ? (
                      <Home className="h-5 w-5 text-gray-400" />
                    ) : location.id === "work" ? (
                      <Briefcase className="h-5 w-5 text-gray-400" />
                    ) : (
                      <MapPin className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Book Ride Button */}
          {dropoffAddress.trim() && (
            <Button
              className="w-full bg-rider-primary text-white py-4 rounded-xl font-semibold hover:bg-rider-primary/90"
              onClick={handleManualDestination}
              data-testid="proceed-booking-button"
            >
              Choose Vehicle
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
