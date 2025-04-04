import { Injectable } from '@nestjs/common';
import { GetCodeDto } from './dto/get-code.dto';

@Injectable()
export class MercadoLibreService {
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

    return { message: 'No se proporcionó código ni error' };
  }
}
