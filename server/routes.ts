import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertDriverSchema, insertRideSchema } from "@shared/schema";
import { authService } from "./auth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user", error });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = req.body;
      
      // Get existing user first
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with new data
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user", error });
    }
  });

  // Auth routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const result = await authService.sendOTP(email);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }

      const result = await authService.verifyOTP(email, code);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message, 
          user: result.user,
          isNewUser: result.isNewUser 
        });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ message: "Phone number required" });
      }

      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error });
    }
  });

  // Driver routes
  app.get("/api/drivers", async (req, res) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching drivers", error });
    }
  });

  app.post("/api/drivers", async (req, res) => {
    try {
      const driverData = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(driverData);
      res.json(driver);
    } catch (error) {
      res.status(400).json({ message: "Invalid driver data", error });
    }
  });

  app.get("/api/drivers/user/:userId", async (req, res) => {
    try {
      const driver = await storage.getDriverByUserId(req.params.userId);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      res.status(500).json({ message: "Error fetching driver", error });
    }
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    try {
      const driver = await storage.updateDriver(req.params.id, req.body);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      res.status(500).json({ message: "Error updating driver", error });
    }
  });

  app.get("/api/drivers/nearby", async (req, res) => {
    try {
      const { lat, lng, vehicleType, radius } = req.query;
      if (!lat || !lng || !vehicleType) {
        return res.status(400).json({ message: "Latitude, longitude, and vehicle type required" });
      }

      const drivers = await storage.getNearbyDrivers(
        parseFloat(lat as string),
        parseFloat(lng as string),
        vehicleType as string,
        radius ? parseFloat(radius as string) : 5 // Default 5km radius
      );
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching nearby drivers", error });
    }
  });

  // Location-related routes
  app.post("/api/geocode", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({ message: "Address required" });
      }

      // Mock geocoding - in real app, integrate with Google Maps Geocoding API
      const mockResult = {
        lat: 28.6139 + (Math.random() - 0.5) * 0.1,
        lng: 77.2090 + (Math.random() - 0.5) * 0.1,
        formatted_address: address,
        place_id: `mock_${Date.now()}`
      };

      res.json(mockResult);
    } catch (error) {
      res.status(500).json({ message: "Geocoding failed", error });
    }
  });

  app.post("/api/reverse-geocode", async (req, res) => {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      // Mock reverse geocoding
      const mockAddress = `Street ${Math.floor(Math.random() * 1000)}, City, State`;
      
      res.json({
        formatted_address: mockAddress,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
    } catch (error) {
      res.status(500).json({ message: "Reverse geocoding failed", error });
    }
  });

  app.post("/api/calculate-distance", async (req, res) => {
    try {
      const { origin, destination } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ message: "Origin and destination required" });
      }

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (destination.lat - origin.lat) * Math.PI / 180;
      const dLng = (destination.lng - origin.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      const duration = Math.round((distance / 25) * 60); // 25 km/h average speed

      res.json({
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        duration: duration, // in minutes
        distance_text: `${distance.toFixed(1)} km`,
        duration_text: `${duration} min`
      });
    } catch (error) {
      res.status(500).json({ message: "Distance calculation failed", error });
    }
  });

  // Admin-specific routes  
  app.get("/api/drivers/online", async (req, res) => {
    try {
      const onlineDrivers = await storage.getOnlineDrivers();
      res.json(onlineDrivers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching online drivers", error });
    }
  });

  app.get("/api/rides/active", async (req, res) => {
    try {
      // Get all rides that are not completed or cancelled
      const activeStatuses = ['searching', 'driver_assigned', 'driver_arrived', 'in_progress'];
      const pendingRides = await storage.getPendingRideRequests();
      
      // For now, return pending rides as active rides
      // In a real implementation, you'd query by status
      res.json(pendingRides);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active rides", error });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const onlineDrivers = await storage.getOnlineDrivers();
      const pendingRides = await storage.getPendingRideRequests();
      const allUsers = await storage.getAllUsers();
      const allDrivers = await storage.getAllDrivers();
      
      // Calculate real statistics from data
      const totalRevenue = pendingRides.reduce((sum, ride) => sum + (parseFloat(ride.fare || '0') || 0), 0);
      
      const stats = {
        totalRides: pendingRides.length + 847, // Include completed rides (mock number)
        completedRides: 847, // Mock completed rides
        activeRides: pendingRides.length,
        onlineDrivers: onlineDrivers.length,
        totalDrivers: allDrivers.length,
        totalUsers: allUsers.length,
        dailyRevenue: totalRevenue + 67500.50, // Add completed ride revenue
        avgTripTime: 24.5,
        avgTripDistance: 8.3,
        ridesByStatus: {
          searching: pendingRides.filter(r => r.status === 'searching').length,
          assigned: pendingRides.filter(r => r.status === 'driver_assigned').length,
          inProgress: pendingRides.filter(r => r.status === 'in_progress').length,
          completed: 847,
          cancelled: 23
        }
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching admin stats", error });
    }
  });

  // Enhanced admin endpoints for user and ride management
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const users = await storage.getAllUsers();
      
      let filteredUsers = users;
      if (search) {
        filteredUsers = users.filter(user => 
          user.name?.toLowerCase().includes(search.toString().toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toString().toLowerCase()) ||
          user.phone?.includes(search.toString())
        );
      }
      
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + Number(limit));
      
      res.json({
        users: paginatedUsers,
        total: filteredUsers.length,
        page: Number(page),
        totalPages: Math.ceil(filteredUsers.length / Number(limit))
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, ...updateData } = req.body;
      
      if (action === 'suspend') {
        updateData.status = 'suspended';
      } else if (action === 'activate') {
        updateData.status = 'active';
      }
      
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error updating user", error });
    }
  });

  app.get("/api/admin/rides", async (req, res) => {
    try {
      const { page = 1, limit = 50, status, search = '' } = req.query;
      const allRides = await storage.getPendingRideRequests(); // We'll use this for now
      
      let filteredRides = allRides;
      if (status && status !== 'all') {
        filteredRides = allRides.filter(ride => ride.status === status);
      }
      if (search) {
        filteredRides = filteredRides.filter(ride => 
          ride.pickupAddress?.toLowerCase().includes(search.toString().toLowerCase()) ||
          ride.dropoffAddress?.toLowerCase().includes(search.toString().toLowerCase()) ||
          ride.id.includes(search.toString())
        );
      }
      
      const startIndex = (Number(page) - 1) * Number(limit);
      const paginatedRides = filteredRides.slice(startIndex, startIndex + Number(limit));
      
      res.json({
        rides: paginatedRides,
        total: filteredRides.length,
        page: Number(page),
        totalPages: Math.ceil(filteredRides.length / Number(limit))
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching rides", error });
    }
  });

  app.patch("/api/admin/rides/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, ...updateData } = req.body;
      
      if (action === 'cancel') {
        updateData.status = 'cancelled';
        updateData.completedAt = new Date();
      } else if (action === 'complete') {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }
      
      const ride = await storage.updateRide(id, updateData);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      res.json(ride);
    } catch (error) {
      res.status(500).json({ message: "Error updating ride", error });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      const allRides = await storage.getPendingRideRequests();
      const allUsers = await storage.getAllUsers();
      
      // Calculate date range based on period
      const now = new Date();
      const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      const periodRides = allRides.filter(ride => 
        ride.createdAt && ride.createdAt >= startDate
      );
      
      const periodUsers = allUsers.filter(user => 
        user.createdAt && user.createdAt >= startDate
      );
      
      // Generate daily data points with mock data enhanced with real data
      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayRides = periodRides.filter(ride => 
          ride.createdAt && ride.createdAt >= dayStart && ride.createdAt < dayEnd
        );
        
        const dayUsers = periodUsers.filter(user => 
          user.createdAt && user.createdAt >= dayStart && user.createdAt < dayEnd
        );
        
        // Add some realistic mock data for visualization
        const baseRides = Math.floor(Math.random() * 20) + 15;
        const baseRevenue = (baseRides + dayRides.length) * 180 + Math.random() * 1000;
        
        dailyData.push({
          date: date.toISOString().split('T')[0],
          rides: dayRides.length + baseRides,
          completedRides: Math.floor((dayRides.length + baseRides) * 0.85),
          revenue: Math.round(baseRevenue * 100) / 100,
          newUsers: dayUsers.length + Math.floor(Math.random() * 10) + 5
        });
      }
      
      res.json({
        period,
        dailyData,
        summary: {
          totalRides: dailyData.reduce((sum, day) => sum + day.rides, 0),
          completedRides: dailyData.reduce((sum, day) => sum + day.completedRides, 0),
          totalRevenue: dailyData.reduce((sum, day) => sum + day.revenue, 0),
          newUsers: dailyData.reduce((sum, day) => sum + day.newUsers, 0)
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching analytics", error });
    }
  });

  // Ride routes
  app.post("/api/rides", async (req, res) => {
    try {
      const rideData = insertRideSchema.parse(req.body);
      
      // Generate OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      
      const ride = await storage.createRide({
        ...rideData,
        status: "searching",
        otp,
      });
      
      res.json(ride);
    } catch (error) {
      res.status(400).json({ message: "Invalid ride data", error });
    }
  });

  app.get("/api/rides/:id", async (req, res) => {
    try {
      const ride = await storage.getRideWithDetails(req.params.id);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      res.json(ride);
    } catch (error) {
      res.status(500).json({ message: "Error fetching ride", error });
    }
  });

  app.patch("/api/rides/:id", async (req, res) => {
    try {
      const updateData = req.body;
      
      // Add timestamps based on status changes
      if (updateData.status === "in_progress" && !updateData.startedAt) {
        updateData.startedAt = new Date();
      }
      
      if (updateData.status === "completed" && !updateData.completedAt) {
        updateData.completedAt = new Date();
      }
      
      const ride = await storage.updateRide(req.params.id, updateData);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      const rideWithDetails = await storage.getRideWithDetails(ride.id);
      res.json(rideWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Error updating ride", error });
    }
  });

  app.get("/api/riders/:riderId/rides", async (req, res) => {
    try {
      const rides = await storage.getRidesByRider(req.params.riderId);
      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: "Error fetching rider rides", error });
    }
  });

  app.get("/api/riders/:riderId/active-ride", async (req, res) => {
    try {
      const ride = await storage.getActiveRideForRider(req.params.riderId);
      res.json(ride || null);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active ride", error });
    }
  });

  app.get("/api/drivers/:driverId/rides", async (req, res) => {
    try {
      const rides = await storage.getRidesByDriver(req.params.driverId);
      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: "Error fetching driver rides", error });
    }
  });

  app.get("/api/drivers/:driverId/active-ride", async (req, res) => {
    try {
      const ride = await storage.getActiveRideForDriver(req.params.driverId);
      res.json(ride || null);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active ride", error });
    }
  });

  app.get("/api/ride-requests", async (req, res) => {
    try {
      const rides = await storage.getPendingRideRequests();
      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: "Error fetching ride requests", error });
    }
  });

  // Driver-specific ride request endpoints
  app.get("/api/drivers/:driverId/ride-requests", async (req, res) => {
    try {
      const { driverId } = req.params;
      const { lat, lng, vehicleType, radius } = req.query;
      
      if (!lat || !lng || !vehicleType) {
        return res.status(400).json({ 
          message: "Driver location (lat, lng) and vehicleType are required" 
        });
      }
      
      const driverLat = parseFloat(lat as string);
      const driverLng = parseFloat(lng as string);
      const searchRadius = radius ? parseFloat(radius as string) : 10;
      
      const rides = await storage.getRideRequestsForDriver(
        driverId, 
        driverLat, 
        driverLng, 
        vehicleType as string, 
        searchRadius
      );
      
      res.json(rides);
    } catch (error) {
      res.status(500).json({ message: "Error fetching driver-specific ride requests", error });
    }
  });

  // Ride request queue management
  app.post("/api/rides/:rideId/queue/:driverId", async (req, res) => {
    try {
      const { rideId, driverId } = req.params;
      await storage.addDriverToRideQueue(rideId, driverId);
      res.json({ success: true, message: "Driver added to ride queue" });
    } catch (error) {
      res.status(500).json({ message: "Error adding driver to queue", error });
    }
  });

  app.delete("/api/rides/:rideId/queue/:driverId", async (req, res) => {
    try {
      const { rideId, driverId } = req.params;
      await storage.removeDriverFromRideQueue(rideId, driverId);
      res.json({ success: true, message: "Driver removed from ride queue" });
    } catch (error) {
      res.status(500).json({ message: "Error removing driver from queue", error });
    }
  });

  app.get("/api/rides/:rideId/queue", async (req, res) => {
    try {
      const { rideId } = req.params;
      const driverIds = await storage.getDriversForRideRequest(rideId);
      res.json({ rideId, driverIds, queueLength: driverIds.length });
    } catch (error) {
      res.status(500).json({ message: "Error fetching ride queue", error });
    }
  });

  // Ride request expiration
  app.post("/api/rides/expire-old-requests", async (req, res) => {
    try {
      const { maxAgeMinutes } = req.body;
      await storage.expireOldRideRequests(maxAgeMinutes || 15);
      res.json({ success: true, message: "Old ride requests expired" });
    } catch (error) {
      res.status(500).json({ message: "Error expiring old requests", error });
    }
  });

  // Calculate fare
  app.post("/api/calculate-fare", async (req, res) => {
    try {
      const { distance, vehicleType } = req.body;
      
      if (!distance || !vehicleType) {
        return res.status(400).json({ message: "Distance and vehicle type required" });
      }

      // Simple fare calculation
      const baseFare = {
        mini: 35,
        sedan: 45,
        suv: 60
      };

      const perKmRate = {
        mini: 12,
        sedan: 18,
        suv: 25
      };

      const base = baseFare[vehicleType as keyof typeof baseFare] || 35;
      const distanceFare = distance * (perKmRate[vehicleType as keyof typeof perKmRate] || 12);
      const subtotal = base + distanceFare;
      const tax = subtotal * 0.05; // 5% GST
      const total = subtotal + tax;

      res.json({
        baseFare: base,
        distanceFare: Math.round(distanceFare),
        tax: Math.round(tax),
        total: Math.round(total)
      });
    } catch (error) {
      res.status(500).json({ message: "Error calculating fare", error });
    }
  });

  // Real-time location tracking for trip management
  app.post("/api/rides/:id/location", async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng, heading, speed, timestamp, userType } = req.body;
      
      if (!lat || !lng || !userType) {
        return res.status(400).json({ message: "Location data and user type required" });
      }

      // Update ride with real-time location data
      const locationUpdate = {
        [`${userType}CurrentLat`]: lat.toString(),
        [`${userType}CurrentLng`]: lng.toString(),
        [`${userType}Heading`]: heading ? heading.toString() : null,
        [`${userType}Speed`]: speed ? speed.toString() : null,
        [`${userType}LastUpdate`]: new Date(timestamp || Date.now())
      };

      const ride = await storage.updateRide(id, locationUpdate);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      res.json({ success: true, message: "Location updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error updating location", error });
    }
  });

  app.get("/api/rides/:id/tracking", async (req, res) => {
    try {
      const { id } = req.params;
      const ride = await storage.getRideWithDetails(id);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // Calculate route progress if ride is in progress
      let routeProgress = 0;
      let estimatedArrival = null;
      
      if (ride.status === 'in_progress' && ride.driverCurrentLat && ride.driverCurrentLng) {
        // Calculate distance to destination
        const destLat = parseFloat(ride.dropoffLat);
        const destLng = parseFloat(ride.dropoffLng);
        const currentLat = parseFloat(ride.driverCurrentLat);
        const currentLng = parseFloat(ride.driverCurrentLng);
        
        // Simple distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (destLat - currentLat) * Math.PI / 180;
        const dLng = (destLng - currentLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(currentLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const remainingDistance = R * c;
        
        const totalDistance = parseFloat(ride.distance || '0');
        routeProgress = totalDistance > 0 ? Math.max(0, Math.min(100, ((totalDistance - remainingDistance) / totalDistance) * 100)) : 0;
        
        // Estimate arrival time (assuming 25 km/h average speed in traffic)
        const eta = Math.round((remainingDistance / 25) * 60); // minutes
        estimatedArrival = new Date(Date.now() + eta * 60 * 1000);
      }

      res.json({
        id: ride.id,
        status: ride.status,
        driverLocation: ride.driverCurrentLat && ride.driverCurrentLng ? {
          lat: parseFloat(ride.driverCurrentLat),
          lng: parseFloat(ride.driverCurrentLng),
          heading: ride.driverHeading ? parseFloat(ride.driverHeading) : null,
          speed: ride.driverSpeed ? parseFloat(ride.driverSpeed) : null,
          lastUpdate: ride.driverLastUpdate
        } : null,
        riderLocation: ride.riderCurrentLat && ride.riderCurrentLng ? {
          lat: parseFloat(ride.riderCurrentLat),
          lng: parseFloat(ride.riderCurrentLng),
          lastUpdate: ride.riderLastUpdate
        } : null,
        pickup: {
          lat: parseFloat(ride.pickupLat),
          lng: parseFloat(ride.pickupLng),
          address: ride.pickupAddress
        },
        dropoff: {
          lat: parseFloat(ride.dropoffLat),
          lng: parseFloat(ride.dropoffLng),
          address: ride.dropoffAddress
        },
        routeProgress,
        estimatedArrival,
        driver: ride.driver ? {
          id: ride.driver.id,
          name: ride.driver.user.name,
          phone: ride.driver.user.phone,
          vehicle: {
            type: ride.driver.vehicleType,
            model: ride.driver.vehicleModel,
            number: ride.driver.vehicleNumber
          }
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching tracking data", error });
    }
  });

  // Navigation and route endpoints
  app.post("/api/navigation/route", async (req, res) => {
    try {
      const { origin, destination, waypoints = [] } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ message: "Origin and destination required" });
      }

      // Mock route generation - in real app, integrate with Google Maps Directions API
      const route = {
        distance: {
          text: "8.5 km",
          value: 8500 // meters
        },
        duration: {
          text: "22 mins",
          value: 1320 // seconds
        },
        steps: [
          {
            instruction: "Head south on Main Street",
            distance: "1.2 km",
            duration: "3 mins",
            maneuver: "straight"
          },
          {
            instruction: "Turn right onto Park Avenue",
            distance: "2.1 km", 
            duration: "5 mins",
            maneuver: "turn-right"
          },
          {
            instruction: "Continue straight for 3.2 km",
            distance: "3.2 km",
            duration: "8 mins", 
            maneuver: "straight"
          },
          {
            instruction: "Turn left onto Destination Street",
            distance: "2.0 km",
            duration: "6 mins",
            maneuver: "turn-left"
          }
        ],
        polyline: "mockPolylineString",
        overview_polyline: "mockOverviewPolyline"
      };

      res.json(route);
    } catch (error) {
      res.status(500).json({ message: "Error generating route", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
