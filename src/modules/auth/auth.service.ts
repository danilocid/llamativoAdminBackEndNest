import { InjectRepository } from '@nestjs/typeorm';
import { LoginAuthDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}
  async login(loginAuthDto: LoginAuthDto) {
    const user = await this.userRepository.findOne({
      where: { user: loginAuthDto.user },
    });
    if (!user) {
      return {
        serverResponseCode: 401,
        serverResponseMessage: 'Usuario no encontrado.',
        data: null,
      };
    }

    const isPasswordValid = await bcrypt.compare(
      loginAuthDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      return {
        serverResponseCode: 401,
        serverResponseMessage: 'Contraseña incorrecta.',
        data: null,
      };
    } else {
      delete user.password;
      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Login exitoso.',
        data: this.jwtService.sign({
          id: user.id,
          user: user.user,
          email: user.email,
          name: user.name,
        }),
      };
    }
  }
}
