import { InjectRepository } from '@nestjs/typeorm';
import { LoginAuthDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ResponseDto } from 'src/common/dto/response.dto';
import { UnauthorizedException } from '@nestjs/common';

export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}
  async login(loginAuthDto: LoginAuthDto): Promise<ResponseDto> {
    const user = await this.userRepository.findOne({
      where: { user: loginAuthDto.user },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginAuthDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta.');
    }
    delete user.password;
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Login exitoso.',
      data: this.jwtService.sign({ ...user }),
    };
  }
}
