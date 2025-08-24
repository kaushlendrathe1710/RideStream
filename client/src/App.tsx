import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import RiderHome from "@/pages/rider/home";
import RiderBooking from "@/pages/rider/booking";
import RiderTrip from "@/pages/rider/trip";
import RiderHistory from "@/pages/rider/history";
import DriverDashboard from "@/pages/driver/dashboard";
import DriverRideRequest from "@/pages/driver/ride-request";
import DriverTrip from "@/pages/driver/trip";
import AdminDashboard from "@/pages/admin/dashboard";
import LoginPage from "@/pages/auth/login";
import OnboardingPage from "@/pages/auth/onboarding";

function Router() {
  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      {/* Redirect to login if not authenticated */}
      <Route path="/" component={user ? RiderHome : LoginPage} />
      <Route path="/rider" component={user ? RiderHome : LoginPage} />
      <Route path="/rider/booking" component={user ? RiderBooking : LoginPage} />
      <Route path="/rider/trip/:rideId" component={user ? RiderTrip : LoginPage} />
      <Route path="/rider/history" component={user ? RiderHistory : LoginPage} />
      <Route path="/driver" component={user ? DriverDashboard : LoginPage} />
      <Route path="/driver/ride-request/:rideId" component={user ? DriverRideRequest : LoginPage} />
      <Route path="/driver/trip/:rideId" component={user ? DriverTrip : LoginPage} />
      <Route path="/admin" component={user ? AdminDashboard : LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen relative">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
