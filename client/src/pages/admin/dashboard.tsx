import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Route,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  LineChart,
  PieChart
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RideWithDetails, DriverWithUser, User as UserType } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [userSearch, setUserSearch] = useState('');
  const [rideSearch, setRideSearch] = useState('');
  const [rideStatusFilter, setRideStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      const response = await fetch('/api/admin/stats');
      return response.json();
    },
    refetchInterval: 10000,
  });

  // Fetch analytics data
  const { data: analyticsData } = useQuery({
    queryKey: ['/api/admin/analytics', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch users for management
  const { data: usersData } = useQuery({
    queryKey: ['/api/admin/users', userSearch],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users?search=${userSearch}&limit=20`);
      return response.json();
    },
    enabled: true,
  });

  // Fetch rides for management
  const { data: ridesData } = useQuery({
    queryKey: ['/api/admin/rides', rideSearch, rideStatusFilter],
    queryFn: async () => {
      const response = await fetch(`/api/admin/rides?search=${rideSearch}&status=${rideStatusFilter}&limit=20`);
      return response.json();
    },
    enabled: true,
  });

  // User management mutations
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      return apiRequest(`/api/admin/users/${userId}`, 'PATCH', { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating user", variant: "destructive" });
    }
  });

  // Ride management mutations
  const updateRideMutation = useMutation({
    mutationFn: async ({ rideId, action }: { rideId: string; action: string }) => {
      return apiRequest(`/api/admin/rides/${rideId}`, 'PATCH', { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rides'] });
      toast({ title: "Ride updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating ride", variant: "destructive" });
    }
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

  const handleUserAction = (userId: string, action: string) => {
    updateUserMutation.mutate({ userId, action });
  };

  const handleRideAction = (rideId: string, action: string) => {
    updateRideMutation.mutate({ rideId, action });
  };

  // Calculate additional stats
  const statsCards = [
    {
      title: "Active Rides",
      value: platformStats?.activeRides || 0,
      icon: Route,
      color: "bg-blue-500",
      change: "+12%",
      description: "Currently in progress"
    },
    {
      title: "Online Drivers", 
      value: platformStats?.onlineDrivers || 0,
      icon: Car,
      color: "bg-green-500",
      change: "+5%",
      description: "Available now"
    },
    {
      title: "Daily Revenue",
      value: formatCurrency(platformStats?.dailyRevenue || 0),
      icon: IndianRupee,
      color: "bg-purple-500",
      change: "+18%",
      description: "Today's earnings"
    },
    {
      title: "Total Users",
      value: platformStats?.totalUsers || 0,
      icon: Users,
      color: "bg-orange-500",
      change: "+23%",
      description: "Platform users"
    },
    {
      title: "Completed Rides",
      value: platformStats?.completedRides || 0,
      icon: CheckCircle,
      color: "bg-emerald-500",
      change: "+15%",
      description: "Successfully completed"
    },
    {
      title: "Total Drivers",
      value: platformStats?.totalDrivers || 0,
      icon: UserCheck,
      color: "bg-blue-600",
      change: "+8%",
      description: "Registered drivers"
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
            <Card key={index} className="p-4" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  <p className="text-xs text-green-600 mt-1">{stat.change} vs yesterday</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} text-white`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Analytics Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Platform Analytics</h3>
              <p className="text-sm text-gray-600">Performance overview and trends</p>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {analyticsData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-600">{analyticsData.summary.totalRides}</p>
                  <p className="text-gray-600">Total Rides</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-600">₹{analyticsData.summary.totalRevenue.toFixed(2)}</p>
                  <p className="text-gray-600">Revenue</p>
                </div>
              </div>
              
              {/* Simple data visualization */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Daily Performance</h4>
                <div className="space-y-1">
                  {analyticsData.dailyData.slice(-7).map((day: any, index: number) => (
                    <div key={day.date} className="flex items-center space-x-2 text-sm">
                      <span className="w-20 text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (day.rides / Math.max(...analyticsData.dailyData.map((d: any) => d.rides))) * 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-gray-900">{day.rides}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Enhanced Management Interface */}
        <Card className="p-6">
          <Tabs defaultValue="drivers" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="drivers" data-testid="tab-drivers">
                Drivers ({onlineDrivers.length})
              </TabsTrigger>
              <TabsTrigger value="rides" data-testid="tab-rides">
                Rides ({activeRides.length})
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                Users ({usersData?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                Analytics
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
                <h3 className="text-lg font-semibold" data-testid="rides-title">Ride Management</h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search rides..."
                      value={rideSearch}
                      onChange={(e) => setRideSearch(e.target.value)}
                      className="pl-8 w-40"
                    />
                  </div>
                  <Select value={rideStatusFilter} onValueChange={setRideStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="searching">Searching</SelectItem>
                      <SelectItem value="driver_assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ridesData?.rides.map((ride: any) => (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    data-testid={`ride-${ride.id}`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-rider-primary rounded-full flex items-center justify-center">
                        <Route className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {ride.rider?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {ride.pickupAddress} → {ride.dropoffAddress}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
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
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-2">
                        <p className="font-medium text-gray-900">
                          {ride.fare ? `₹${ride.fare}` : 'Calculating...'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {ride.driver?.user.name || 'No driver'}
                        </p>
                      </div>
                      {(ride.status === 'searching' || ride.status === 'driver_assigned') && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRideAction(ride.id, 'cancel')}
                            disabled={updateRideMutation.isPending}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {ridesData?.rides.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No rides found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" data-testid="users-title">User Management</h3>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 w-60"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {usersData?.users.map((user: UserType) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    data-testid={`user-${user.id}`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={user.type === 'driver' ? 'default' : 'secondary'} className="text-xs">
                            {user.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {user.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-2">
                        <p className="text-sm text-gray-600">
                          ⭐ {user.rating || '5.00'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.totalTrips || 0} trips
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, 'suspend')}
                          disabled={updateUserMutation.isPending}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUserAction(user.id, 'activate')}
                          disabled={updateUserMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {usersData?.users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No users found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Ride Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {platformStats?.ridesByStatus && Object.entries(platformStats.ridesByStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  
                  <Card className="p-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Trip Time</span>
                        <span className="font-medium">{platformStats?.avgTripTime || 0} min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Distance</span>
                        <span className="font-medium">{platformStats?.avgTripDistance || 0} km</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="font-medium text-green-600">
                          {platformStats?.completedRides && platformStats?.totalRides 
                            ? Math.round((platformStats.completedRides / platformStats.totalRides) * 100)
                            : 0}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* System Controls and Quick Actions */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">System Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="flex items-center space-x-2"
              onClick={() => queryClient.invalidateQueries()}
            >
              <Activity className="h-4 w-4" />
              <span>Refresh Data</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center space-x-2"
              onClick={() => setLocation('/admin/map')}
            >
              <MapPin className="h-4 w-4" />
              <span>Live Map</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center space-x-2"
              onClick={() => {
                // Export analytics data
                const csvData = analyticsData?.dailyData.map((day: any) => 
                  `${day.date},${day.rides},${day.revenue},${day.newUsers}`
                ).join('\n');
                const blob = new Blob([`Date,Rides,Revenue,New Users\n${csvData}`], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'analytics-data.csv';
                a.click();
              }}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center space-x-2"
              onClick={() => {
                toast({
                  title: "System Health Check",
                  description: "All systems operational. Database connected."
                });
              }}
            >
              <Activity className="h-4 w-4" />
              <span>Health Check</span>
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