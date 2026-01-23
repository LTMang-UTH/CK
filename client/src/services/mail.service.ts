import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class MailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!MailService.transporter) {
      // Verify configuration before creating transporter
      if (!config.mailHost || !config.mailUser || !config.mailPass || !config.mailSendAs) {
        throw new Error('Mail service is not configured. Please set MAIL_HOST, MAIL_USER, MAIL_PASS, and MAIL_SENDAS environment variables.');
      }

      MailService.transporter = nodemailer.createTransport({
        host: config.mailHost,
        port: 587,
        secure: false, // true for 465, false for other ports
        requireTLS: true,
        auth: {
          user: config.mailUser,
          pass: config.mailPass,
        },
        logger: true,
        debug: true, // Enable debug mode
      });

      console.log('Mail transporter created:', {
        host: config.mailHost,
        port: 587,
        user: config.mailUser,
        sendAs: config.mailSendAs,
      });
    }
    return MailService.transporter;
  }

  static async sendResetPasswordMail(
    email: string,
    username: string,
    otp: string
  ): Promise<boolean> {
    try {
      console.log(`[MailService] Attempting to send reset password email to: ${email} for user: ${username}`);
      console.log(`[MailService] OTP: ${otp}`);

      // Get transporter (will throw if not configured)
      const transporter = MailService.getTransporter();

      // Verify connection before sending
      try {
        await transporter.verify();
        console.log('[MailService] SMTP server connection verified');
      } catch (verifyError: any) {
        console.error('[MailService] SMTP verification failed:', verifyError);
        throw new Error(`SMTP connection failed: ${verifyError.message || 'Unknown error'}`);
      }

      const info = await transporter.sendMail({
        from: `FunDraw <${config.mailSendAs}>`,
        to: email,
        subject: 'Reset Password - FunDraw',
        text: `Hello ${username},\n\nTo reset your password, please enter the OTP code below to the app:\n\n${otp}\n\nHave fun!`,
        html: `<!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>FunDraw | Reset Password</title> <style> body { font-family: Arial, sans-serif; background-color: #f4f4f9; margin: 0; padding: 0; } .email-container { max-width: 600px; margin: 50px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow: hidden; } .email-header { background: #1e2d3d; color: #ffffff; text-align: center; padding: 20px; } .email-header h1 { margin: 0; font-size: 24px; } .email-body { padding: 20px; color: #333333; line-height: 1.6; } .email-body p { margin: 0 0 15px; } .email-body .link { color: #ff6b6b; } .reset-button { display: inline-block; padding: 12px 20px; background: #ff6b6b; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; margin-top: 10px; } </style></head><body> <div class="email-container"> <div class="email-header"> <h1>Reset Password - FunDraw</h1> </div> <div class="email-body"> <p>Hello, ${username}</p> <p>To reset your password, please enter the OTP code below to the app.</p> <p class="reset-button" style="text-align: center;">${otp}</p> <p>Have fun!</p> </div> </div></body></html>`,
      });

      console.log('[MailService] Email sent successfully!');
      console.log('[MailService] Message ID:', info.messageId);
      console.log('[MailService] Response:', info.response);
      return true;
    } catch (error: any) {
      console.error('[MailService] Error sending email:', error);
      console.error('[MailService] Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });
      
      // Provide more helpful error messages
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check MAIL_USER and MAIL_PASS in .env file.');
      } else if (error.code === 'ECONNECTION') {
        throw new Error(`Cannot connect to SMTP server (${config.mailHost}:587). Please check MAIL_HOST and network connection.`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('SMTP server connection timeout. Please check your network connection.');
      } else if (error.message?.includes('not configured')) {
        throw error; // Re-throw configuration errors as-is
      } else {
        throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
      }
    }
  }
}

