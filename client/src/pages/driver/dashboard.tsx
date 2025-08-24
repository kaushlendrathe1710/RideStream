import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import type { RideWithDetails } from "@shared/schema";

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(true);

  // Check for pending ride requests
  const { data: pendingRides } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/ride-requests'],
    queryFn: async () => {
      const response = await fetch('/api/ride-requests');
      return response.json();
    },
    refetchInterval: isOnline ? 5000 : false,
  });

  // Check for active ride
  const { data: activeRide } = useQuery<RideWithDetails | null>({
    queryKey: ['/api/drivers/driver-1/active-ride'],
    queryFn: async () => {
      const response = await fetch('/api/drivers/driver-1/active-ride');
      return response.json();
    },
    refetchInterval: 3000,
  });

  // Redirect to active ride if exists
  useEffect(() => {
    if (activeRide && ['driver_assigned', 'driver_arrived', 'in_progress'].includes(activeRide.status)) {
      setLocation(`/driver/trip/${activeRide.id}`);
    }
  }, [activeRide, setLocation]);

  // Show ride request if there's a pending one
  useEffect(() => {
    if (pendingRides && pendingRides.length > 0 && isOnline) {
      setLocation(`/driver/ride-request/${pendingRides[0].id}`);
    }
  }, [pendingRides, isOnline, setLocation]);

  const handleModeSwitch = () => {
    setLocation("/rider");
  };

  const handleToggleOnline = () => {
    setIsOnline(!isOnline);
  };

  const handleViewEarnings = () => {
    // Navigate to earnings page (not implemented)
  };

  // Mock stats data
  const stats = {
    trips: 8,
    hours: "6.2h",
    earnings: "₹1,247"
  };

  const recentTrips = [
    {
      id: "1",
      from: "Downtown",
      to: "Airport",
      distance: "12.4 km",
      duration: "35 min",
      timeAgo: "2 hours ago",
      fare: "₹186",
      rating: 5.0
    },
    {
      id: "2",
      from: "Mall",
      to: "Home",
      distance: "8.2 km",
      duration: "22 min",
      timeAgo: "3 hours ago",
      fare: "₹124",
      rating: 4.8
    }
  ];

  return (
    <>
      <Header
        title="Driver Dashboard"
        mode="driver"
        onModeSwitch={handleModeSwitch}
      />

      <Map
        showDriverMarkers
        currentLocation={{ lat: 28.6139, lng: 77.2090 }}
      />

      <BottomSheet>
        <div className="p-6 space-y-4">
          {/* Online/Offline Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900" data-testid="online-status">
                You're {isOnline ? "online" : "offline"}
              </h2>
              <p className="text-gray-500" data-testid="online-description">
                {isOnline ? "Ready to accept rides" : "Go online to accept rides"}
              </p>
            </div>
            <Button
              variant={isOnline ? "default" : "outline"}
              onClick={handleToggleOnline}
              className={`w-16 h-8 rounded-full transition-colors ${
                isOnline 
                  ? "bg-driver-primary hover:bg-driver-primary/90" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              data-testid="online-toggle"
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                isOnline ? "translate-x-2" : "-translate-x-2"
              }`}></div>
            </Button>
          </div>

          {/* Today's Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900" data-testid="stats-trips">{stats.trips}</p>
              <p className="text-sm text-gray-600">Trips</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900" data-testid="stats-hours">{stats.hours}</p>
              <p className="text-sm text-gray-600">Hours</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-driver-primary" data-testid="stats-earnings">{stats.earnings}</p>
              <p className="text-sm text-gray-600">Earned</p>
            </div>
          </div>

          {/* Recent Trips */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900" data-testid="recent-trips-title">Recent trips</h3>
            <div className="space-y-3">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="bg-gray-50 rounded-lg p-4" data-testid={`trip-${trip.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900" data-testid={`trip-route-${trip.id}`}>
                        {trip.from} → {trip.to}
                      </p>
                      <p className="text-sm text-gray-600" data-testid={`trip-details-${trip.id}`}>
                        {trip.distance} • {trip.duration}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`trip-time-${trip.id}`}>
                        {trip.timeAgo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900" data-testid={`trip-fare-${trip.id}`}>
                        {trip.fare}
                      </p>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1" data-testid={`trip-rating-${trip.id}`}>
                          {trip.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Summary */}
          <Button
            className="w-full bg-driver-primary text-white py-4 rounded-xl font-semibold hover:bg-driver-primary/90"
            onClick={handleViewEarnings}
            data-testid="view-earnings-button"
          >
            View Detailed Earnings
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
