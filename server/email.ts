import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null;
  private developmentMode: boolean;

  constructor() {
    // Check if we have valid SMTP credentials for production email sending
    const hasValidCredentials = process.env.SMTP_HOST && 
                               process.env.SMTP_USER && 
                               process.env.SMTP_PASS && 
                               process.env.SMTP_HOST !== 'your-smtp-host';
    
    // Enable production mode if credentials are available and user wants real emails
    this.developmentMode = !hasValidCredentials;
    
    if (this.developmentMode) {
      console.log('📧 Email service running in DEVELOPMENT MODE - emails will be simulated');
      console.log('💡 OTP codes will be logged to console for testing');
      this.transporter = null;
      return;
    }
    
    console.log('📧 Email service running in PRODUCTION MODE - real emails will be sent');
    console.log(`📮 SMTP Host: ${process.env.SMTP_HOST}`);
    console.log(`👤 SMTP User: ${process.env.SMTP_USER}`);

    // Try port 465 with SSL for Hostinger
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: false, // Use STARTTLS for port 587
      requireTLS: true, // Force STARTTLS for port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Hostinger-specific settings
      tls: {
        rejectUnauthorized: false,
        servername: process.env.SMTP_HOST
      },
      debug: false, // Disable for cleaner logs
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.developmentMode) {
        console.log('🎭 DEVELOPMENT MODE - Simulating email send:');
        console.log(`📧 To: ${options.to}`);
        console.log(`📝 Subject: ${options.subject}`);
        if (options.text) console.log(`📄 Text: ${options.text}`);
        console.log('✅ Email simulation completed successfully');
        return true;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter!.sendMail(mailOptions);
      console.log('✅ Email sent successfully to:', options.to);
      console.log('📧 Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ SMTP Error - Failed to send email:', error.message);
      console.log('💡 Common fixes:');
      console.log('   - Check if SMTP password is correct');
      console.log('   - Enable "Less secure app access" or use App Password');
      console.log('   - Verify SMTP host and port settings');
      console.log('   - For Gmail: Use app-specific password');
      console.log('🔄 Falling back to development mode for this request...');
      return false;
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    if (this.developmentMode) {
      console.log('🎭 DEVELOPMENT MODE - OTP Email Simulation:');
      console.log(`📧 To: ${email}`);
      console.log(`🔢 OTP Code: ${otp}`);
      console.log('💡 Use this OTP code to complete authentication in development');
      return true;
    }

    console.log(`📤 Attempting to send OTP email to: ${email}`);
    console.log(`🔢 Generated OTP: ${otp}`);

    const subject = 'Your Ride App Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">🚗 Ride App</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Verification Code</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
            Enter this code to complete your login:
          </p>
          
          <div style="background-color: #fff; border: 2px dashed #007bff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px;">${otp}</span>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© 2025 Ride App. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
      Your Ride App Verification Code: ${otp}
      
      Enter this code to complete your login.
      This code will expire in 10 minutes.
      
      If you didn't request this code, please ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP server connection verified');
      return true;
    } catch (error) {
      console.error('SMTP server connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();