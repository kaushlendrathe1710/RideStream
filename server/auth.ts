import { storage } from './storage';
import { emailService } from './email';
import { randomBytes } from 'crypto';

export class AuthService {
  // Generate a 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP to email
  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Generate OTP
      const otp = this.generateOTP();
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Store OTP in database
      await storage.createOtp({
        email,
        code: otp,
        expiresAt
      });

      // Send email
      const emailSent = await emailService.sendOTP(email, otp);
      
      if (!emailSent) {
        return { success: false, message: 'Failed to send email' };
      }

      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Verify OTP and return user
  async verifyOTP(email: string, code: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      // Find valid OTP
      const otpRecord = await storage.getOtp(email, code);
      
      if (!otpRecord) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      // Mark OTP as verified
      await storage.markOtpAsVerified(otpRecord.id);

      // Check if user exists
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user if doesn't exist
        user = await storage.createUser({
          name: email.split('@')[0], // Use email prefix as default name
          email,
          phone: '', // Will be updated later if needed
          type: 'rider' // Default to rider
        });
      }

      return { 
        success: true, 
        message: 'Login successful', 
        user 
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Cleanup expired OTPs (should be called periodically)
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      await storage.cleanupExpiredOtps();
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }
}

export const authService = new AuthService();