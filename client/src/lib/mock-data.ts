export const mockLocations = [
  {
    id: "home",
    name: "Home",
    address: "123 Main Street, Downtown",
    icon: "home",
    lat: 28.6139,
    lng: 77.2090,
  },
  {
    id: "work",
    name: "Work",
    address: "456 Business Ave, Tech District",
    icon: "briefcase",
    lat: 28.6129,
    lng: 77.2295,
  },
  {
    id: "mall",
    name: "Central Mall",
    address: "Central Mall, Sector 21",
    icon: "shopping-bag",
    lat: 28.6149,
    lng: 77.2085,
  },
  {
    id: "airport",
    name: "Airport",
    address: "Airport Terminal 1",
    icon: "plane",
    lat: 28.5562,
    lng: 77.1000,
  },
];

export const vehicleTypes = [
  {
    id: "mini",
    name: "Mini",
    description: "Affordable, compact rides",
    icon: "car",
    baseFare: 35,
    perKm: 12,
    eta: "2 min",
  },
  {
    id: "sedan",
    name: "Sedan",
    description: "Comfortable sedans",
    icon: "car",
    baseFare: 45,
    perKm: 18,
    eta: "4 min",
  },
  {
    id: "suv",
    name: "SUV",
    description: "Spacious SUVs",
    icon: "truck",
    baseFare: 60,
    perKm: 25,
    eta: "6 min",
  },
];

export const getCurrentLocation = (): Promise<{ lat: number; lng: number; address: string }> => {
  return new Promise((resolve) => {
    // Mock current location
    setTimeout(() => {
      resolve({
        lat: 28.6139,
        lng: 77.2090,
        address: "Current Location",
      });
    }, 1000);
  });
};

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const calculateDuration = (distance: number): number => {
  // Assume average speed of 25 km/h in city traffic
  return Math.round((distance / 25) * 60);
};
