import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login de usuario. Devuelve un JWT si las credenciales son correctas.
   */
  @Post('login')
  @ApiBody({
    description: 'Credenciales de login',
    type: LoginAuthDto,
    examples: {
      ejemplo: {
        summary: 'Login básico',
        value: {
          user: 'admin',
          password: '123456',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: ResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async create(@Body() loginAuthDto: LoginAuthDto): Promise<ResponseDto> {
    return await this.authService.login(loginAuthDto);
  }
}
