import { cn } from "@/lib/utils";

interface MapProps {
  className?: string;
  showDriverMarkers?: boolean;
  currentLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
}

export function Map({ 
  className, 
  showDriverMarkers = false,
  currentLocation,
  pickupLocation,
  dropoffLocation
}: MapProps) {
  return (
    <div className={cn("relative h-80 bg-gray-100 overflow-hidden", className)}>
      <div className="map-bg absolute inset-0"></div>
      
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Current location marker */}
        {currentLocation && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg pulse-dot" data-testid="current-location-marker"></div>
            <div className="w-8 h-8 bg-blue-500 bg-opacity-20 rounded-full absolute -top-2 -left-2"></div>
          </div>
        )}
        
        {/* Pickup location marker */}
        {pickupLocation && (
          <div className="absolute top-16 left-1/3 transform -translate-x-1/2">
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg" data-testid="pickup-location-marker"></div>
          </div>
        )}
        
        {/* Dropoff location marker */}
        {dropoffLocation && (
          <div className="absolute bottom-16 right-1/3 transform translate-x-1/2">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg" data-testid="dropoff-location-marker"></div>
          </div>
        )}
        
        {/* Driver markers */}
        {showDriverMarkers && (
          <>
            <div className="absolute top-32 left-20 w-3 h-3 bg-driver-primary rounded-full border border-white shadow" data-testid="driver-marker-1"></div>
            <div className="absolute top-40 right-24 w-3 h-3 bg-driver-primary rounded-full border border-white shadow" data-testid="driver-marker-2"></div>
            <div className="absolute bottom-32 left-1/3 w-3 h-3 bg-driver-primary rounded-full border border-white shadow" data-testid="driver-marker-3"></div>
          </>
        )}
      </div>
    </div>
  );
}
