import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    const mailOptions = {
      from: `"Support" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your Registration OTP',
      text: `Your OTP for registration is: ${otp}. It will expire in 10 minutes.`,
      html: `<p>Your OTP for registration is: <b>${otp}</b></p><p>It will expire in 10 minutes.</p>`,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendResetOtpEmail(to: string, otp: string) {
    const mailOptions = {
      from: `"Support" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Your Password Reset Code',
      text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `<p>Your OTP for password reset is: <b>${otp}</b></p><p>It will expire in 10 minutes. If you did not request this, please ignore this email.</p>`,
    };

    return this.transporter.sendMail(mailOptions);
  }
}
