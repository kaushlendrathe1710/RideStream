import { cn } from "@/lib/utils";

interface MapProps {
  className?: string;
  showDriverMarkers?: boolean;
  currentLocation?: { lat: number; lng: number };
  pickupLocation?: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
  driverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
  };
  riderLocation?: {
    lat: number;
    lng: number;
  };
  showRoute?: boolean;
  showProgress?: number;
  routePolyline?: string;
}

export function Map({ 
  className, 
  showDriverMarkers = false,
  currentLocation,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  riderLocation,
  showRoute = false,
  showProgress = 0,
  routePolyline
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
        
        {/* Driver location marker */}
        {driverLocation && (
          <div className="absolute top-24 left-1/4 transform -translate-x-1/2">
            <div className="w-5 h-5 bg-driver-primary rounded-full border-2 border-white shadow-lg" data-testid="driver-location-marker"></div>
            {driverLocation.heading && (
              <div 
                className="absolute top-1/2 left-1/2 w-3 h-3 bg-driver-primary transform -translate-x-1/2 -translate-y-1/2 rotate-45"
                style={{ transform: `translate(-50%, -50%) rotate(${driverLocation.heading}deg)` }}
              />
            )}
          </div>
        )}
        
        {/* Rider location marker */}
        {riderLocation && (
          <div className="absolute top-28 right-1/4 transform translate-x-1/2">
            <div className="w-4 h-4 bg-rider-primary rounded-full border-2 border-white shadow-lg" data-testid="rider-location-marker"></div>
          </div>
        )}
        
        {/* Route visualization */}
        {showRoute && (
          <div className="absolute inset-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M20,30 Q40,10 60,30 T80,60"
                stroke="#3B82F6"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                className="animate-pulse"
                data-testid="route-path"
              />
            </svg>
            {showProgress > 0 && (
              <div 
                className="absolute top-0 left-0 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
                style={{ 
                  left: `${Math.min(showProgress, 100)}%`,
                  top: `${30 + Math.sin(showProgress * 0.02) * 20}%`
                }}
                data-testid="progress-indicator"
              />
            )}
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
