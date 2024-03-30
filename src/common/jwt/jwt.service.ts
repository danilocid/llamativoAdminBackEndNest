import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthService {
  constructor(private jwtService: JwtService) {}

  async generateToken(user: any): Promise<string> {
    const payload =user; 
    return this.jwtService.sign(payload);
  }

}
