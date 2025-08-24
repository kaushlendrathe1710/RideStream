import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Car, 
  MapPin, 
  TrendingUp, 
  Clock, 
  IndianRupee,
  Eye,
  Activity,
  Wifi,
  WifiOff,
  Navigation,
  User,
  Route
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { RideWithDetails, DriverWithUser } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Fetch all active drivers
  const { data: onlineDrivers = [] } = useQuery<DriverWithUser[]>({
    queryKey: ['/api/drivers/online'],
    queryFn: async () => {
      const response = await fetch('/api/drivers/online');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch all active rides
  const { data: activeRides = [] } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/rides/active'],
    queryFn: async () => {
      const response = await fetch('/api/rides/active');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch platform statistics
  const { data: platformStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      // Mock data - in real app, this would be calculated from database
      return {
        totalRides: 1247,
        activeRides: activeRides.length,
        onlineDrivers: onlineDrivers.length,
        totalDrivers: 156,
        totalUsers: 2891,
        dailyRevenue: 89750.50,
        avgTripTime: 24.5,
        avgTripDistance: 8.3
      };
    },
    refetchInterval: 10000,
  });

  const handleModeSwitch = () => {
    setLocation("/admin");
  };

  const handleViewRide = (rideId: string) => {
    setLocation(`/admin/ride/${rideId}`);
  };

  const handleViewDriver = (driverId: string) => {
    setLocation(`/admin/driver/${driverId}`);
  };

  // Calculate additional stats
  const statsCards = [
    {
      title: "Active Rides",
      value: activeRides.length,
      icon: Route,
      color: "bg-blue-500",
      change: "+12%"
    },
    {
      title: "Online Drivers", 
      value: onlineDrivers.length,
      icon: Car,
      color: "bg-green-500",
      change: "+5%"
    },
    {
      title: "Daily Revenue",
      value: formatCurrency(platformStats?.dailyRevenue || 0),
      icon: IndianRupee,
      color: "bg-purple-500",
      change: "+18%"
    },
    {
      title: "Total Users",
      value: platformStats?.totalUsers || 0,
      icon: Users,
      color: "bg-orange-500",
      change: "+23%"
    }
  ];

  return (
    <>
      <Header
        title="Admin Dashboard"
        mode="admin"
        onModeSwitch={handleModeSwitch}
      />

      <div className="p-6 space-y-6 max-h-screen overflow-y-auto pb-20">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          {statsCards.map((stat, index) => (
            <Card key={index} className="p-4" data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-green-600 mt-1">{stat.change} vs yesterday</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} text-white`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Real-time Monitoring */}
        <Card className="p-6">
          <Tabs defaultValue="drivers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="drivers" data-testid="tab-drivers">
                Drivers ({onlineDrivers.length})
              </TabsTrigger>
              <TabsTrigger value="rides" data-testid="tab-rides">
                Active Rides ({activeRides.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drivers" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" data-testid="drivers-title">Online Drivers</h3>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  {onlineDrivers.length} online
                </Badge>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {onlineDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleViewDriver(driver.id)}
                    data-testid={`driver-${driver.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-driver-primary rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{driver.user.name}</p>
                        <p className="text-sm text-gray-600">
                          {driver.vehicleModel} • {driver.vehicleType}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {driver.currentLat && driver.currentLng
                              ? `${parseFloat(driver.currentLat).toFixed(3)}, ${parseFloat(driver.currentLng).toFixed(3)}`
                              : 'Location unavailable'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Online</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        ₹{driver.totalEarnings || '0'}
                      </p>
                    </div>
                  </div>
                ))}

                {onlineDrivers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <WifiOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No drivers online</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rides" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" data-testid="rides-title">Active Rides</h3>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <Navigation className="h-3 w-3 mr-1" />
                  {activeRides.length} active
                </Badge>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activeRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleViewRide(ride.id)}
                    data-testid={`ride-${ride.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-rider-primary rounded-full flex items-center justify-center">
                        <Route className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {ride.rider.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {ride.pickupAddress} → {ride.dropoffAddress}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              ride.status === 'searching' ? 'secondary' :
                              ride.status === 'driver_assigned' ? 'default' :
                              ride.status === 'in_progress' ? 'destructive' : 'outline'
                            }
                            className="text-xs"
                          >
                            {ride.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {ride.vehicleType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {ride.fare ? `₹${ride.fare}` : 'Calculating...'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ride.driver?.user.name || 'No driver'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ride.distance ? `${ride.distance} km` : ''}
                      </p>
                    </div>
                  </div>
                ))}

                {activeRides.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No active rides</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Monitor Map</span>
            </Button>
          </div>
        </Card>

        {/* Real-time Updates Control */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Real-time Updates</h4>
              <p className="text-sm text-gray-600">
                Refreshing every {refreshInterval / 1000}s
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={refreshInterval === 2000 ? "default" : "outline"}
                size="sm"
                onClick={() => setRefreshInterval(2000)}
              >
                Fast
              </Button>
              <Button
                variant={refreshInterval === 5000 ? "default" : "outline"}
                size="sm"
                onClick={() => setRefreshInterval(5000)}
              >
                Normal
              </Button>
              <Button
                variant={refreshInterval === 10000 ? "default" : "outline"}
                size="sm"
                onClick={() => setRefreshInterval(10000)}
              >
                Slow
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}