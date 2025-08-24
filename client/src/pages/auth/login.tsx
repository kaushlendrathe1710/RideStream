import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Shield } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('/api/auth/send-otp', 'POST', { email });
    },
    onSuccess: (data) => {
      if (data.success) {
        setStep('otp');
        toast({
          title: "OTP Sent",
          description: "Check your email for the verification code",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    }
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      return apiRequest('/api/auth/verify-otp', 'POST', { email, code });
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store user data in localStorage for now
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast({
          title: "Login Successful",
          description: "Welcome to the ride app!",
        });
        
        // Redirect based on user type
        if (data.user.type === 'driver') {
          setLocation('/driver');
        } else {
          setLocation('/rider');
        }
      } else {
        toast({
          title: "Invalid Code",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    }
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    sendOtpMutation.mutate(email);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate({ email, code: otp });
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              {step === 'email' ? (
                <Mail className="h-6 w-6 text-blue-600" />
              ) : (
                <Shield className="h-6 w-6 text-blue-600" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'email' ? 'Welcome Back' : 'Enter Verification Code'}
          </CardTitle>
          <CardDescription>
            {step === 'email' 
              ? 'Enter your email to receive a login code'
              : `We sent a 6-digit code to ${email}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  className="h-11"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={sendOtpMutation.isPending}
                data-testid="button-send-otp"
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  data-testid="input-otp"
                  className="h-11 text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11"
                disabled={verifyOtpMutation.isPending}
                data-testid="button-verify-otp"
              >
                {verifyOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </Button>
              
              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToEmail}
                  className="text-sm"
                  data-testid="button-back-to-email"
                >
                  Change Email Address
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => sendOtpMutation.mutate(email)}
                  disabled={sendOtpMutation.isPending}
                  className="text-sm"
                  data-testid="button-resend-otp"
                >
                  {sendOtpMutation.isPending ? 'Sending...' : 'Resend Code'}
                </Button>
              </div>
            </form>
          )}
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>By continuing, you agree to our terms of service</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}