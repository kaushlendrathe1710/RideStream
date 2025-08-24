import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertDriverSchema, insertRideSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
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
      const { lat, lng, vehicleType } = req.query;
      if (!lat || !lng || !vehicleType) {
        return res.status(400).json({ message: "Latitude, longitude, and vehicle type required" });
      }

      const drivers = await storage.getNearbyDrivers(
        parseFloat(lat as string),
        parseFloat(lng as string),
        vehicleType as string
      );
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching nearby drivers", error });
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

  const httpServer = createServer(app);
  return httpServer;
}
