import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthService } from '../application/services/auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OAuthDto } from './dto/oauth.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiResponse } from '@repo/shared';
import { Request, Response } from 'express';
import { GoogleProfile } from '../strategies/google.strategy';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<any>> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      loginDto.tenantSubdomain,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const result = await this.authService.login(user);

    return {
      success: true,
      data: result,
      message: 'Login successful',
    };
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponse<any>> {
    const user = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
      registerDto.tenantSubdomain,
      registerDto.invitationToken,
    );

    const result = await this.authService.login(user);

    return {
      success: true,
      data: result,
      message: 'Registration successful',
    };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Initiates Google OAuth flow
    // Tenant will be automatically determined from the user's email domain
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const googleProfile = req.user as GoogleProfile;

      // Tenant is automatically determined from email domain
      const result = await this.authService.googleLogin(googleProfile);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const token = result.access_token;
      const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/login?error=google_auth_failed`);
    }
  }

  @Public()
  @Post('oauth')
  async oauthLogin(@Body() oauthDto: OAuthDto): Promise<ApiResponse<any>> {
    try {
      const result = await this.authService.oauthLogin({
        provider: oauthDto.provider,
        providerAccountId: oauthDto.providerAccountId,
        email: oauthDto.email,
        name: oauthDto.name,
        image: oauthDto.image,
      });

      return {
        success: true,
        data: result,
        message: 'OAuth login successful',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth authentication failed';
      throw new UnauthorizedException(message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('impersonate/:userId')
  async impersonateUser(
    @CurrentUser() currentUser: any,
    @Req() req: Request,
  ): Promise<ApiResponse<any>> {
    const targetUserId = (req.params as any).userId;
    
    const result = await this.authService.impersonateUser(targetUserId, {
      userId: currentUser.userId,
      email: currentUser.email,
      role: currentUser.role,
    });

    return {
      success: true,
      data: result,
      message: 'Switched to user successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('stop-impersonation')
  async stopImpersonation(
    @Body() body: { originalUserId: string },
  ): Promise<ApiResponse<any>> {
    const result = await this.authService.stopImpersonation(body.originalUserId);

    return {
      success: true,
      data: result,
      message: 'Returned to original user successfully',
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() body: { email: string },
  ): Promise<ApiResponse<any>> {
    const result = await this.authService.forgotPassword(body.email);

    // Always return success to prevent email enumeration
    // The actual email sending would be handled by a separate service
    if (result) {
      // In a real implementation, you would send an email here
      // For now, we'll just return success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${result.token}`;
      
      // Log the reset URL for testing (remove in production)
      console.log(`Password reset URL for ${body.email}: ${resetUrl}`);
    }

    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; password: string },
  ): Promise<ApiResponse<any>> {
    await this.authService.resetPassword(body.token, body.password);

    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }
}
