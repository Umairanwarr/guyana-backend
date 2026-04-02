import { Controller, Post, Get, Delete, Body, HttpCode, HttpStatus, Req, UnauthorizedException, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, VerifyOtpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto, GoogleAuthDto, FacebookAuthDto, UpdateProfilePhotoDto } from './dto/auth.dto';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  async resendOtp(@Body('email') email: string) {
    return this.authService.resendOtp(email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      // We know they are a valid user if verify succeeds, return their profile info
      return this.authService.getProfile(payload.sub);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('update-profile')
  async updateProfile(@Req() req: Request, @Body() updateProfileDto: UpdateProfileDto) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      return this.authService.updateProfile(payload.sub, updateProfileDto);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @HttpCode(HttpStatus.OK)
  @Delete('delete-account')
  async deleteAccount(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      return this.authService.deleteAccount(payload.sub);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('google')
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleAuth(googleAuthDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('facebook')
  async facebookAuth(@Body() facebookAuthDto: FacebookAuthDto) {
    return this.authService.facebookAuth(facebookAuthDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('admin-login')
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @Post('upload-profile-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `profile-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Accept all files - let the frontend handle validation
        // The file extension will determine the actual type
        callback(null, true);
      },
    }),
  )
  async uploadProfilePhoto(
    @Req() req: Request,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);

      if (!photo) {
        throw new BadRequestException('No file uploaded');
      }

      const photoUrl = `/uploads/profiles/${photo.filename}`;

      // Update user's photo URL in database
      await this.authService.updateProfilePhoto(payload.sub, photoUrl);

      return {
        success: true,
        message: 'Profile photo uploaded successfully',
        photoUrl,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
