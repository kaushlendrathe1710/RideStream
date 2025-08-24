import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Map } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Clock, 
  Star, 
  Download, 
  RotateCcw, 
  Search,
  Calendar,
  MapPin,
  Car,
  IndianRupee,
  User,
  Phone,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RideWithDetails } from "@shared/schema";

export default function RiderHistory() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideWithDetails | null>(null);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const { toast } = useToast();

  // Get current user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Fetch complete ride history
  const { data: rideHistory = [], isLoading } = useQuery<RideWithDetails[]>({
    queryKey: ['/api/riders', user?.id, 'rides'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/riders/${user.id}/rides`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Rebook ride mutation
  const rebookMutation = useMutation({
    mutationFn: async (ride: RideWithDetails) => {
      const tripData = {
        pickup: {
          lat: parseFloat(ride.pickupLat),
          lng: parseFloat(ride.pickupLng),
          address: ride.pickupAddress
        },
        dropoff: {
          lat: parseFloat(ride.dropoffLat),
          lng: parseFloat(ride.dropoffLng),
          address: ride.dropoffAddress
        }
      };
      localStorage.setItem('tripData', JSON.stringify(tripData));
      return tripData;
    },
    onSuccess: () => {
      setLocation('/rider/booking');
    }
  });

  // Rate ride mutation
  const rateMutation = useMutation({
    mutationFn: async ({ rideId, rating }: { rideId: string; rating: number }) => {
      const response = await fetch(`/api/rides/${rideId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, riderId: user?.id })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/riders', user?.id, 'rides'] });
      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback!"
      });
    }
  });

  const handleBack = () => {
    setLocation('/rider');
  };

  const handleModeSwitch = () => {
    setLocation('/driver');
  };

  const handleRebook = (ride: RideWithDetails) => {
    rebookMutation.mutate(ride);
  };

  const handleRate = (rideId: string, rating: number) => {
    rateMutation.mutate({ rideId, rating });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'searching': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'in_progress': return 'In Progress';
      case 'searching': return 'Searching';
      case 'driver_assigned': return 'Driver Assigned';
      case 'driver_arrived': return 'Driver Arrived';
      default: return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter rides based on search and status
  const filteredRides = rideHistory.filter(ride => {
    const matchesSearch = searchQuery === '' || 
      ride.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropoffAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || ride.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Group rides by date
  const groupedRides = filteredRides.reduce((groups, ride) => {
    const date = formatDate(ride.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(ride);
    return groups;
  }, {} as Record<string, RideWithDetails[]>);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rider-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ride history...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Ride History"
        mode="rider"
        onModeSwitch={handleModeSwitch}
      />

      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        {/* Header and Search */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Ride History</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="filter-button"
            >
              <Filter className="h-5 w-5 text-gray-600" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search rides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200"
              data-testid="search-input"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <div className="flex space-x-2">
                  {['all', 'completed', 'cancelled', 'in_progress'].map((status) => (
                    <Button
                      key={status}
                      variant={selectedStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStatus(status)}
                      className="text-xs"
                      data-testid={`filter-${status}`}
                    >
                      {status === 'all' ? 'All' : getStatusText(status)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{rideHistory.length}</p>
              <p className="text-xs text-gray-600">Total Rides</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {rideHistory.filter(r => r.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                ₹{rideHistory.filter(r => r.status === 'completed' && r.fare)
                  .reduce((sum, r) => sum + parseFloat(r.fare!), 0).toFixed(0)}
              </p>
              <p className="text-xs text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Rides List */}
        <div className="p-4 space-y-4">
          {filteredRides.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No rides found</p>
              <p className="text-sm text-gray-400">
                {searchQuery ? "Try a different search term" : "Start booking rides to see your history"}
              </p>
            </div>
          ) : (
            Object.entries(groupedRides).map(([date, rides]) => (
              <div key={date} className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {date}
                </h3>
                
                {rides.map((ride) => (
                  <Card key={ride.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={`text-xs ${getStatusColor(ride.status)}`}>
                          {getStatusText(ride.status)}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatTime(ride.createdAt)}</p>
                          {ride.fare && (
                            <p className="text-sm text-gray-600">₹{ride.fare}</p>
                          )}
                        </div>
                      </div>

                      {/* Route Information */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <p className="text-sm text-gray-900 flex-1">{ride.pickupAddress}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 border-2 border-red-500 rounded-full"></div>
                          <p className="text-sm text-gray-900 flex-1">{ride.dropoffAddress}</p>
                        </div>
                      </div>

                      {/* Driver and Vehicle Info */}
                      {ride.driver && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{ride.driver.user.name}</p>
                              <p className="text-xs text-gray-600">
                                {ride.driver.vehicleModel} • {ride.driver.vehicleNumber}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600 ml-1">{ride.driver.user.rating}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Details */}
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRide(expandedRide === ride.id ? null : ride.id)}
                          className="w-full justify-between p-2 h-auto"
                          data-testid={`expand-ride-${ride.id}`}
                        >
                          <span className="text-sm text-gray-600">Trip Details</span>
                          {expandedRide === ride.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>

                        {expandedRide === ride.id && (
                          <div className="mt-3 space-y-3 border-t pt-3">
                            {/* Trip Details */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600">Distance</p>
                                <p className="font-medium">{ride.distance} km</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Duration</p>
                                <p className="font-medium">{ride.duration}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Vehicle Type</p>
                                <p className="font-medium capitalize">{ride.vehicleType}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Ride ID</p>
                                <p className="font-medium text-xs">{ride.id.substring(0, 8)}</p>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2">
                              {ride.status === 'completed' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRebook(ride)}
                                    className="flex-1"
                                    data-testid={`rebook-${ride.id}`}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Rebook
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    data-testid={`receipt-${ride.id}`}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Receipt
                                  </Button>
                                </>
                              )}
                            </div>

                            {/* Rating - Temporarily disabled until schema is updated */}
                            {ride.status === 'completed' && (
                              <div className="border-t pt-3">
                                <p className="text-sm text-gray-600 mb-2">Rate your ride:</p>
                                <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <Button
                                      key={rating}
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRate(ride.id, rating)}
                                      className="p-1"
                                      data-testid={`rate-${ride.id}-${rating}`}
                                    >
                                      <Star className="w-5 h-5 text-yellow-400" />
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}