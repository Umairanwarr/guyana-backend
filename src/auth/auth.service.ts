import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignupDto, VerifyOtpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, GoogleAuthDto, FacebookAuthDto, UpdateProfilePhotoDto } from './dto/auth.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {
    console.log('AuthService initialized');
  }

  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new BadRequestException('User with this email already exists and is verified.');
      }
      // If not verified, we'll allow resending OTP by updating the existing record
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existingUser) {
      await this.prisma.user.update({
        where: { email },
        data: { password: hashedPassword, otp, otpExpiry, name: name || existingUser.name },
      });
    } else {
      await this.prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          otp,
          otpExpiry,
        },
      });
    }

    try {
      console.log(`Attempting to send OTP email to: ${email}`);
      await this.emailService.sendOtpEmail(email, otp);
      console.log(`OTP email sent successfully to: ${email}`);
    } catch (error) {
      console.error('Failed to send email error details:', error);
      throw new BadRequestException('Failed to send OTP to your email. Please try again later.');
    }

    return { message: 'OTP sent to your email successfully.' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified.');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP.');
    }

    if (user.otpExpiry && user.otpExpiry < new Date()) {
      throw new BadRequestException('OTP has expired.');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiry: null,
      },
    });

    return { message: 'Email verified successfully. You can now login.' };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login successful.',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        photoUrl: user.photoUrl,
      },
    };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpiry },
    });

    try {
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      console.error('Failed to resend email:', error);
      throw new BadRequestException('Failed to resend OTP.');
    }

    return { message: 'New OTP sent to your email.' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    // Don't return sensitive info
    const { password, otp, otpExpiry, ...result } = user;
    return result;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpiry },
    });

    try {
      await this.emailService.sendResetOtpEmail(email, otp);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      throw new BadRequestException('Failed to send reset link.');
    }

    return { message: 'Password reset code sent to your email.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, password } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid verification code.');
    }

    if (user.otpExpiry && user.otpExpiry < new Date()) {
      throw new BadRequestException('Verification code has expired.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
      },
    });

    return { message: 'Password successfully reset. You can now log in.' };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const { name, phone, photoUrl } = updateProfileDto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
      },
    });

    const { password, otp, otpExpiry, ...result } = user;
    return {
      message: 'Profile updated successfully.',
      user: result,
    };
  }

  async deleteAccount(userId: number) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'Account deleted successfully.',
    };
  }

  async updateProfilePhoto(userId: number, photoUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        photoUrl: photoUrl,
      },
    });

    const { password, otp, otpExpiry, ...result } = user;
    return {
      message: 'Profile photo updated successfully.',
      user: result,
    };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { idToken, email, name, photoURL } = googleAuthDto;

    try {
      // Verify the Firebase ID token
      console.log('Verifying Firebase ID token...');
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log('Token verified, UID:', decodedToken.uid);

      // Get the user's Firebase record
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);

      if (!firebaseUser) {
        throw new BadRequestException('Invalid Firebase user');
      }

      // Check if user exists in our database
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Create new user - Google users are pre-verified
        user = await this.prisma.user.create({
          data: {
            email,
            name: name || firebaseUser.displayName || '',
            phone: firebaseUser.phoneNumber || null,
            photoUrl: photoURL || firebaseUser.photoURL || null,
            isVerified: true, // Google verified users are trusted
            // Generate a random password since they won't use password login
            password: await bcrypt.hash(Math.random().toString(36).slice(-18), 10),
          },
        });
      } else {
        // Update existing user's info if needed
        // Only update photoUrl if user hasn't uploaded a custom photo
        const existingPhotoUrl = user.photoUrl;
        const shouldUpdatePhoto = !existingPhotoUrl || existingPhotoUrl.startsWith('/uploads/profiles');

        user = await this.prisma.user.update({
          where: { email },
          data: {
            name: name || user.name,
            photoUrl: shouldUpdatePhoto && !existingPhotoUrl
              ? (photoURL || firebaseUser.photoURL || null)
              : existingPhotoUrl,
            isVerified: true,
          },
        });
      }

      // Generate JWT token for our app
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      return {
        message: 'Google authentication successful.',
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          photoUrl: user.photoUrl,
        },
      };
    } catch (error) {
      console.error('Google Auth Error:', error);
      console.error('Error details:', error.message, error.code);
      throw new BadRequestException(`Google authentication failed: ${error.message || error}`);
    }
  }

  async facebookAuth(facebookAuthDto: FacebookAuthDto) {
    const { idToken, email, name, photoURL } = facebookAuthDto;

    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // Get the user's Firebase record
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);

      if (!firebaseUser) {
        throw new BadRequestException('Invalid Firebase user');
      }

      // Check if user exists in our database
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Create new user - Facebook users are pre-verified
        user = await this.prisma.user.create({
          data: {
            email,
            name: name || firebaseUser.displayName || '',
            phone: firebaseUser.phoneNumber || null,
            photoUrl: photoURL || firebaseUser.photoURL || null,
            isVerified: true, // Facebook verified users are trusted
            // Generate a random password since they won't use password login
            password: await bcrypt.hash(Math.random().toString(36).slice(-18), 10),
          },
        });
      } else {
        // Update existing user's info if needed
        user = await this.prisma.user.update({
          where: { email },
          data: {
            name: name || user.name,
            photoUrl: photoURL || user.photoUrl,
            isVerified: true,
          },
        });
      }

      // Generate JWT token for our app
      const payload = { sub: user.id, email: user.email };
      const token = this.jwtService.sign(payload);

      return {
        message: 'Facebook authentication successful.',
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          photoUrl: user.photoUrl,
        },
      };
    } catch (error) {
      console.error('Facebook Auth Error:', error);
      throw new BadRequestException('Facebook authentication failed');
    }
  }

  async adminLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isAdmin) {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { sub: user.id, email: user.email, isAdmin: true };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Admin login successful.',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    };
  }
}
