import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import RiderHome from "@/pages/rider/home";
import RiderBooking from "@/pages/rider/booking";
import RiderTrip from "@/pages/rider/trip";
import DriverDashboard from "@/pages/driver/dashboard";
import DriverRideRequest from "@/pages/driver/ride-request";
import DriverTrip from "@/pages/driver/trip";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RiderHome} />
      <Route path="/rider" component={RiderHome} />
      <Route path="/rider/booking" component={RiderBooking} />
      <Route path="/rider/trip/:rideId" component={RiderTrip} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/ride-request/:rideId" component={DriverRideRequest} />
      <Route path="/driver/trip/:rideId" component={DriverTrip} />
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
