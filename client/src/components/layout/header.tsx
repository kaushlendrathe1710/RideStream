import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, LogIn } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  mode: "rider" | "driver" | "admin";
  onModeSwitch: () => void;
}

export function Header({ title, mode, onModeSwitch }: HeaderProps) {
  const [location, setLocation] = useLocation();
  
  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    setLocation('/login');
  };
  
  const handleLogin = () => {
    setLocation('/login');
  };
  
  return (
    <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between relative z-20" data-testid="header">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" className="p-2" data-testid="menu-button">
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
        <div>
          <h1 className="font-semibold text-gray-900" data-testid="app-title">{title}</h1>
          <p className="text-xs text-gray-500" data-testid="current-location">Current Location</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant={mode === "driver" ? "default" : "secondary"}
          size="sm"
          onClick={onModeSwitch}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            mode === "driver" 
              ? "bg-driver-primary text-white hover:bg-driver-primary/90" 
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          data-testid="mode-switch-button"
        >
          Switch to {mode === "rider" ? "Driver" : mode === "driver" ? "Admin" : "Rider"}
        </Button>
        {user ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="p-2"
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogin}
            className="p-2"
            data-testid="login-button"
          >
            <LogIn className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>
    </header>
  );
}
