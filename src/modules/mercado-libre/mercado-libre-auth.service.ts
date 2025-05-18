import { Injectable } from '@nestjs/common';
import { MercadoLibreToken } from './entities/mercado-libre.entity';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Importar el servicio de logging de Google
import { GoogleLoggingService } from '../../common/services/google-logging.service';
import { GetCodeDto } from './dto/get-code.dto';

@Injectable()
export class MercadoLibreAuthService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(MercadoLibreToken)
    private readonly mercadoLibreTokenRepository: Repository<MercadoLibreToken>,
    private readonly googleLoggingService: GoogleLoggingService, // Inyectar el servicio
  ) {}

  async getAuthToken() {
    const url = 'https://api.mercadolibre.com/oauth/token';
    const token = await this.getTokenFromDb();

    if (!token) {
      await this.googleLoggingService.log(
        'No se encontró el token en la base de datos',
        null,
        'ERROR',
        'getAuthToken',
        'mercado-libre-auth',
      );
      throw new Error('No se encontró el token en la base de datos');
    }
    if (token) {
      const now = new Date();
      const createdAt = new Date(token.createdAt);
      const diffInSeconds = Math.floor(
        (now.getTime() - createdAt.getTime()) / 1000,
      );
      await this.googleLoggingService.log(
        `Diferencia en segundos: ${diffInSeconds}`,
        null,
        'INFO',
        'getAuthToken',
        'mercado-libre-auth',
      );
      if (diffInSeconds < 21500) {
        // Si el token es válido (menos de 21500 segundos desde su creación), lo devolvemos
        await this.googleLoggingService.log(
          'Token válido, no es necesario refrescarlo',
          null,
          'INFO',
          'getAuthToken',
          'mercado-libre-auth',
        );
        return token.accessToken;
      }
    }
    // Si el token no es válido o no existe, lo refrescamos
    await this.googleLoggingService.log(
      'Token no válido o no existe, refrescando token...',
      null,
      'INFO',
      'getAuthToken',
      'mercado-libre-auth',
    );

    const data = {
      grant_type: 'refresh_token',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      refresh_token: token.refreshToken,
      redirect_uri:
        'https://llamativo-admin-backend-832653590074.us-central1.run.app/mercado-libre',
    };
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    let response = await firstValueFrom(
      this.httpService.post(url, data, {
        headers: headers,
        validateStatus: () => true,
      }),
    );
    this.saveTokenToDb({
      id: token.id,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.googleLoggingService.log(
      'token de autorización:',
      response.data,
      'INFO',
      'getAuthToken',
      'mercado-libre-auth',
    );
    return response.data.access_token;
  }

  async getTokenFromDb() {
    // Obtener el token más reciente de la base de datos
    const tokens = await this.mercadoLibreTokenRepository.find({
      order: { createdAt: 'DESC' },
      take: 1, // Limitar el resultado a un solo registro
    });

    if (tokens.length === 0) {
      await this.googleLoggingService.log(
        'No se encontró el token en la base de datos',
        null,
        'ERROR',
        'getTokenFromDb',
        'mercado-libre-auth',
      );
      throw new Error('No se encontró el token en la base de datos');
    }

    return tokens[0]; // Retornar el primer (y único) token encontrado
  }

  async saveTokenToDb(token: MercadoLibreToken) {
    // Guardar el token en la base de datos
    delete token.id;
    const newToken = this.mercadoLibreTokenRepository.create(token);
    await this.mercadoLibreTokenRepository.save(newToken);
  }

  getAuthCode(query: GetCodeDto) {
    console.log(query);
    if (query.code) {
      console.log('Código de autorización:', query.code);
      return { code: query.code };
    } else if (query.error) {
      console.log('Error:', query.error);
      console.log('Descripción del error:', query.error_description);
      return {
        error: query.error,
        error_description: query.error_description,
      };
    }
    return { message: 'No se recibió ningún código de autorización' };
  }
}
