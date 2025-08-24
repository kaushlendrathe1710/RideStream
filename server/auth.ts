import { storage } from './storage';
import { emailService } from './email';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

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

      // Send email (try real email first, fallback to console)
      const emailSent = await emailService.sendOTP(email, otp);
      
      if (!emailSent) {
        // Fallback: Show OTP in console for development
        console.log('🚨 EMAIL FALLBACK MODE:');
        console.log(`📧 To: ${email}`);
        console.log(`🔢 OTP Code: ${otp}`);
        console.log('💡 Email failed, use this OTP from console');
        
        return { 
          success: true, 
          message: 'OTP ready - check console logs as email delivery failed' 
        };
      }

      return { success: true, message: 'OTP sent to your email successfully' };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Login with password
  async loginWithPassword(email: string, password: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }
      
      if (!user.password) {
        return { success: false, message: 'Password not set. Please use OTP login or set a password first.' };
      }
      
      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        return { success: false, message: 'Invalid email or password' };
      }
      
      return { 
        success: true, 
        message: 'Login successful', 
        user: { ...user, password: undefined } // Remove password from response
      };
    } catch (error) {
      console.error('Error during password login:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Update user password
  async updatePassword(userId: string, currentPassword: string | null, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // If user has existing password, verify current password
      if (user.password && currentPassword) {
        const isValidCurrentPassword = await this.verifyPassword(currentPassword, user.password);
        if (!isValidCurrentPassword) {
          return { success: false, message: 'Current password is incorrect' };
        }
      }
      
      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Update password
      await storage.updateUserPassword(userId, hashedPassword);
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Verify OTP and return user
  async verifyOTP(email: string, code: string): Promise<{ success: boolean; message: string; user?: any; isNewUser?: boolean }> {
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
      let isNewUser = false;
      
      if (!user) {
        // Create minimal user profile for new users
        user = await storage.createUser({
          name: '', // Empty name to indicate incomplete profile
          email,
          phone: '', 
          type: 'rider' // Default type, will be updated during onboarding
        });
        isNewUser = true;
      }

      return { 
        success: true, 
        message: 'Login successful', 
        user,
        isNewUser
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