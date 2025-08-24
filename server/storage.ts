import { type User, type InsertUser, type Driver, type InsertDriver, type Ride, type InsertRide, type DriverWithUser, type RideWithDetails, users, drivers, rides } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;

  // Drivers
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverByUserId(userId: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<Driver>): Promise<Driver | undefined>;
  getOnlineDrivers(): Promise<DriverWithUser[]>;
  getNearbyDrivers(lat: number, lng: number, vehicleType: string, radius?: number): Promise<DriverWithUser[]>;

  // Rides
  getRide(id: string): Promise<Ride | undefined>;
  getRideWithDetails(id: string): Promise<RideWithDetails | undefined>;
  createRide(ride: InsertRide): Promise<Ride>;
  updateRide(id: string, ride: Partial<Ride>): Promise<Ride | undefined>;
  getRidesByRider(riderId: string): Promise<RideWithDetails[]>;
  getRidesByDriver(driverId: string): Promise<RideWithDetails[]>;
  getActiveRideForRider(riderId: string): Promise<RideWithDetails | undefined>;
  getActiveRideForDriver(driverId: string): Promise<RideWithDetails | undefined>;
  getPendingRideRequests(): Promise<RideWithDetails[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private drivers: Map<string, Driver> = new Map();
  private rides: Map<string, Ride> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create sample riders
    const rider1: User = {
      id: "rider-1",
      name: "Priya Singh",
      email: "priya@example.com",
      phone: "+91-9876543210",
      type: "rider",
      profilePicture: null,
      rating: "4.9",
      totalTrips: 45,
      createdAt: new Date(),
    };

    const rider2: User = {
      id: "rider-2",
      name: "Amit Kumar",
      email: "amit@example.com",
      phone: "+91-9876543211",
      type: "rider",
      profilePicture: null,
      rating: "4.7",
      totalTrips: 23,
      createdAt: new Date(),
    };

    // Create sample drivers
    const driverUser1: User = {
      id: "driver-user-1",
      name: "Rajesh Kumar",
      email: "rajesh@example.com",
      phone: "+91-9876543212",
      type: "driver",
      profilePicture: null,
      rating: "4.8",
      totalTrips: 234,
      createdAt: new Date(),
    };

    const driverUser2: User = {
      id: "driver-user-2",
      name: "Suresh Sharma",
      email: "suresh@example.com",
      phone: "+91-9876543213",
      type: "driver",
      profilePicture: null,
      rating: "4.6",
      totalTrips: 156,
      createdAt: new Date(),
    };

    const driver1: Driver = {
      id: "driver-1",
      userId: "driver-user-1",
      licenseNumber: "DL123456789",
      vehicleModel: "Maruti Swift",
      vehicleNumber: "DL 01 AB 1234",
      vehicleType: "sedan",
      isOnline: true,
      currentLat: "28.6139",
      currentLng: "77.2090",
      totalEarnings: "12475.50",
    };

    const driver2: Driver = {
      id: "driver-2",
      userId: "driver-user-2",
      licenseNumber: "DL987654321",
      vehicleModel: "Hyundai i10",
      vehicleNumber: "DL 02 CD 5678",
      vehicleType: "mini",
      isOnline: true,
      currentLat: "28.6129",
      currentLng: "77.2085",
      totalEarnings: "8925.75",
    };

    this.users.set(rider1.id, rider1);
    this.users.set(rider2.id, rider2);
    this.users.set(driverUser1.id, driverUser1);
    this.users.set(driverUser2.id, driverUser2);
    this.drivers.set(driver1.id, driver1);
    this.drivers.set(driver2.id, driver2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      profilePicture: null,
      rating: "5.00",
      totalTrips: 0,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    return this.drivers.get(id);
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    return Array.from(this.drivers.values()).find(driver => driver.userId === userId);
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const id = randomUUID();
    const driver: Driver = { 
      ...insertDriver, 
      id,
      isOnline: false,
      currentLat: null,
      currentLng: null,
      totalEarnings: "0.00"
    };
    this.drivers.set(id, driver);
    return driver;
  }

  async updateDriver(id: string, updateData: Partial<Driver>): Promise<Driver | undefined> {
    const driver = this.drivers.get(id);
    if (!driver) return undefined;
    
    const updatedDriver = { ...driver, ...updateData };
    this.drivers.set(id, updatedDriver);
    return updatedDriver;
  }

  async getOnlineDrivers(): Promise<DriverWithUser[]> {
    const onlineDrivers = Array.from(this.drivers.values()).filter(driver => driver.isOnline);
    const driversWithUsers: DriverWithUser[] = [];
    
    for (const driver of onlineDrivers) {
      const user = await this.getUser(driver.userId);
      if (user) {
        driversWithUsers.push({ ...driver, user });
      }
    }
    
    return driversWithUsers;
  }

  async getNearbyDrivers(lat: number, lng: number, vehicleType: string, radius: number = 5): Promise<DriverWithUser[]> {
    const onlineDrivers = await this.getOnlineDrivers();
    
    // Simple distance calculation - in real app would use proper geospatial queries
    const nearbyDrivers = onlineDrivers.filter(driver => {
      if (driver.vehicleType !== vehicleType) return false;
      if (!driver.currentLat || !driver.currentLng) return false;
      
      const driverLat = parseFloat(driver.currentLat);
      const driverLng = parseFloat(driver.currentLng);
      const distance = Math.sqrt(Math.pow(lat - driverLat, 2) + Math.pow(lng - driverLng, 2));
      
      return distance < (radius / 111); // Convert km to degrees (roughly)
    });
    
    return nearbyDrivers;
  }

  async getRide(id: string): Promise<Ride | undefined> {
    return this.rides.get(id);
  }

  async getRideWithDetails(id: string): Promise<RideWithDetails | undefined> {
    const ride = this.rides.get(id);
    if (!ride) return undefined;

    const rider = await this.getUser(ride.riderId);
    if (!rider) return undefined;

    let driver: DriverWithUser | undefined;
    if (ride.driverId) {
      const driverData = await this.getDriver(ride.driverId);
      if (driverData) {
        const driverUser = await this.getUser(driverData.userId);
        if (driverUser) {
          driver = { ...driverData, user: driverUser };
        }
      }
    }

    return { ...ride, rider, driver };
  }

  async createRide(insertRide: InsertRide): Promise<Ride> {
    const id = randomUUID();
    const ride: Ride = { 
      ...insertRide,
      driverId: insertRide.driverId || null,
      duration: insertRide.duration || null,
      fare: insertRide.fare || null,
      distance: insertRide.distance || null,
      id,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };
    this.rides.set(id, ride);
    return ride;
  }

  async updateRide(id: string, updateData: Partial<Ride>): Promise<Ride | undefined> {
    const ride = this.rides.get(id);
    if (!ride) return undefined;
    
    const updatedRide = { ...ride, ...updateData };
    this.rides.set(id, updatedRide);
    return updatedRide;
  }

  async getRidesByRider(riderId: string): Promise<RideWithDetails[]> {
    const riderRides = Array.from(this.rides.values()).filter(ride => ride.riderId === riderId);
    const ridesWithDetails: RideWithDetails[] = [];
    
    for (const ride of riderRides) {
      const rideWithDetails = await this.getRideWithDetails(ride.id);
      if (rideWithDetails) {
        ridesWithDetails.push(rideWithDetails);
      }
    }
    
    return ridesWithDetails.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getRidesByDriver(driverId: string): Promise<RideWithDetails[]> {
    const driverRides = Array.from(this.rides.values()).filter(ride => ride.driverId === driverId);
    const ridesWithDetails: RideWithDetails[] = [];
    
    for (const ride of driverRides) {
      const rideWithDetails = await this.getRideWithDetails(ride.id);
      if (rideWithDetails) {
        ridesWithDetails.push(rideWithDetails);
      }
    }
    
    return ridesWithDetails.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getActiveRideForRider(riderId: string): Promise<RideWithDetails | undefined> {
    const activeStatuses = ['searching', 'driver_assigned', 'driver_arrived', 'in_progress'];
    const activeRide = Array.from(this.rides.values()).find(
      ride => ride.riderId === riderId && activeStatuses.includes(ride.status)
    );
    
    if (!activeRide) return undefined;
    return this.getRideWithDetails(activeRide.id);
  }

  async getActiveRideForDriver(driverId: string): Promise<RideWithDetails | undefined> {
    const activeStatuses = ['driver_assigned', 'driver_arrived', 'in_progress'];
    const activeRide = Array.from(this.rides.values()).find(
      ride => ride.driverId === driverId && activeStatuses.includes(ride.status)
    );
    
    if (!activeRide) return undefined;
    return this.getRideWithDetails(activeRide.id);
  }

  async getPendingRideRequests(): Promise<RideWithDetails[]> {
    const pendingRides = Array.from(this.rides.values()).filter(ride => ride.status === 'searching');
    const ridesWithDetails: RideWithDetails[] = [];
    
    for (const ride of pendingRides) {
      const rideWithDetails = await this.getRideWithDetails(ride.id);
      if (rideWithDetails) {
        ridesWithDetails.push(rideWithDetails);
      }
    }
    
    return ridesWithDetails;
  }
}

// DatabaseStorage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver || undefined;
  }

  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.userId, userId));
    return driver || undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db
      .insert(drivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateDriver(id: string, updateData: Partial<Driver>): Promise<Driver | undefined> {
    const [driver] = await db
      .update(drivers)
      .set(updateData)
      .where(eq(drivers.id, id))
      .returning();
    return driver || undefined;
  }

  async getOnlineDrivers(): Promise<DriverWithUser[]> {
    const onlineDrivers = await db
      .select()
      .from(drivers)
      .leftJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.isOnline, true));
    
    return onlineDrivers.map(result => ({
      ...result.drivers,
      user: result.users!
    }));
  }

  async getNearbyDrivers(lat: number, lng: number, vehicleType: string, radius: number = 5): Promise<DriverWithUser[]> {
    const onlineDrivers = await this.getOnlineDrivers();
    
    // Simple distance calculation - in real app would use proper geospatial queries
    const nearbyDrivers = onlineDrivers.filter(driver => {
      if (driver.vehicleType !== vehicleType) return false;
      if (!driver.currentLat || !driver.currentLng) return false;
      
      const driverLat = parseFloat(driver.currentLat);
      const driverLng = parseFloat(driver.currentLng);
      const distance = Math.sqrt(Math.pow(lat - driverLat, 2) + Math.pow(lng - driverLng, 2));
      
      return distance < (radius / 111); // Convert km to degrees (roughly)
    });
    
    return nearbyDrivers;
  }

  async getRide(id: string): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride || undefined;
  }

  async getRideWithDetails(id: string): Promise<RideWithDetails | undefined> {
    const rideData = await db
      .select()
      .from(rides)
      .leftJoin(users, eq(rides.riderId, users.id))
      .leftJoin(drivers, eq(rides.driverId, drivers.id))
      .where(eq(rides.id, id));

    if (rideData.length === 0) return undefined;

    const result = rideData[0];
    if (!result.users) return undefined;

    let driver: DriverWithUser | undefined;
    if (result.drivers) {
      const driverUser = await this.getUser(result.drivers.userId);
      if (driverUser) {
        driver = { ...result.drivers, user: driverUser };
      }
    }

    return {
      ...result.rides,
      rider: result.users,
      driver
    };
  }

  async createRide(insertRide: InsertRide): Promise<Ride> {
    const [ride] = await db
      .insert(rides)
      .values(insertRide)
      .returning();
    return ride;
  }

  async updateRide(id: string, updateData: Partial<Ride>): Promise<Ride | undefined> {
    const [ride] = await db
      .update(rides)
      .set(updateData)
      .where(eq(rides.id, id))
      .returning();
    return ride || undefined;
  }

  async getRidesByRider(riderId: string): Promise<RideWithDetails[]> {
    const riderRides = await db
      .select()
      .from(rides)
      .leftJoin(users, eq(rides.riderId, users.id))
      .leftJoin(drivers, eq(rides.driverId, drivers.id))
      .where(eq(rides.riderId, riderId))
      .orderBy(rides.createdAt);

    const ridesWithDetails: RideWithDetails[] = [];
    
    for (const result of riderRides) {
      if (!result.users) continue;

      let driver: DriverWithUser | undefined;
      if (result.drivers) {
        const driverUser = await this.getUser(result.drivers.userId);
        if (driverUser) {
          driver = { ...result.drivers, user: driverUser };
        }
      }

      ridesWithDetails.push({
        ...result.rides,
        rider: result.users,
        driver
      });
    }
    
    return ridesWithDetails.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getRidesByDriver(driverId: string): Promise<RideWithDetails[]> {
    const driverRides = await db
      .select()
      .from(rides)
      .leftJoin(users, eq(rides.riderId, users.id))
      .leftJoin(drivers, eq(rides.driverId, drivers.id))
      .where(eq(rides.driverId, driverId))
      .orderBy(rides.createdAt);

    const ridesWithDetails: RideWithDetails[] = [];
    
    for (const result of driverRides) {
      if (!result.users) continue;

      let driver: DriverWithUser | undefined;
      if (result.drivers) {
        const driverUser = await this.getUser(result.drivers.userId);
        if (driverUser) {
          driver = { ...result.drivers, user: driverUser };
        }
      }

      ridesWithDetails.push({
        ...result.rides,
        rider: result.users,
        driver
      });
    }
    
    return ridesWithDetails.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getActiveRideForRider(riderId: string): Promise<RideWithDetails | undefined> {
    const activeStatuses = ['searching', 'driver_assigned', 'driver_arrived', 'in_progress'];
    const activeRide = await db
      .select()
      .from(rides)
      .where(eq(rides.riderId, riderId))
      .limit(1);
    
    const activeRideData = activeRide.find(ride => activeStatuses.includes(ride.status));
    if (!activeRideData) return undefined;
    
    return this.getRideWithDetails(activeRideData.id);
  }

  async getActiveRideForDriver(driverId: string): Promise<RideWithDetails | undefined> {
    const activeStatuses = ['driver_assigned', 'driver_arrived', 'in_progress'];
    const activeRide = await db
      .select()
      .from(rides)
      .where(eq(rides.driverId, driverId))
      .limit(1);
    
    const activeRideData = activeRide.find(ride => activeStatuses.includes(ride.status));
    if (!activeRideData) return undefined;
    
    return this.getRideWithDetails(activeRideData.id);
  }

  async getPendingRideRequests(): Promise<RideWithDetails[]> {
    const pendingRides = await db
      .select()
      .from(rides)
      .leftJoin(users, eq(rides.riderId, users.id))
      .where(eq(rides.status, 'searching'));

    const ridesWithDetails: RideWithDetails[] = [];
    
    for (const result of pendingRides) {
      if (!result.users) continue;

      ridesWithDetails.push({
        ...result.rides,
        rider: result.users,
        driver: undefined
      });
    }
    
    return ridesWithDetails;
  }
}

// Initialize sample data in database
async function seedDatabase() {
  try {
    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      return; // Data already seeded
    }

    // Create sample riders
    const rider1 = await db.insert(users).values({
      name: "Priya Singh",
      email: "priya@example.com",
      phone: "+91-9876543210",
      type: "rider",
    }).returning();

    const rider2 = await db.insert(users).values({
      name: "Amit Kumar", 
      email: "amit@example.com",
      phone: "+91-9876543211",
      type: "rider",
    }).returning();

    // Create sample drivers
    const driverUser1 = await db.insert(users).values({
      name: "Rajesh Kumar",
      email: "rajesh@example.com", 
      phone: "+91-9876543212",
      type: "driver",
    }).returning();

    const driverUser2 = await db.insert(users).values({
      name: "Suresh Sharma",
      email: "suresh@example.com",
      phone: "+91-9876543213", 
      type: "driver",
    }).returning();

    // Create driver profiles
    await db.insert(drivers).values({
      userId: driverUser1[0].id,
      licenseNumber: "DL123456789",
      vehicleModel: "Maruti Swift",
      vehicleNumber: "DL 01 AB 1234",
      vehicleType: "sedan",
      isOnline: true,
      currentLat: "28.6139",
      currentLng: "77.2090",
      totalEarnings: "12475.50",
    });

    await db.insert(drivers).values({
      userId: driverUser2[0].id,
      licenseNumber: "DL987654321", 
      vehicleModel: "Hyundai i10",
      vehicleNumber: "DL 02 CD 5678",
      vehicleType: "mini",
      isOnline: true,
      currentLat: "28.6129",
      currentLng: "77.2085", 
      totalEarnings: "8925.75",
    });

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Seed database on startup
seedDatabase();

export const storage = new DatabaseStorage();
