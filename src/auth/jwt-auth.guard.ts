import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // AuthService signs tokens using { sub: user.id, email }, so prefer `sub`
      request.user = { userId: decoded.sub ?? decoded.userId };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
