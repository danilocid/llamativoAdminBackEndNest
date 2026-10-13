// Los decoradores de class-validator y class-transformer lo necesitan; en los
// demas specs lo aporta NestJS al importar @nestjs/testing
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from '@jest/globals';
import { ListWoocommerceProductsDto } from './list-woocommerce-products.dto';

/**
 * Los query params llegan siempre como cadena, así que el transformador del
 * flag `sincronizar` es lo que decide si la petición escribe en la tienda o
 * solo compara.
 */
describe('ListWoocommerceProductsDto', () => {
  const transformar = (entrada: Record<string, unknown>) =>
    plainToInstance(ListWoocommerceProductsDto, entrada);

  describe('sincronizar', () => {
    it('viene activado por defecto cuando no se envia el parametro', () => {
      const dto = transformar({});

      expect(dto.sincronizar).toBe(true);
    });

    it('se desactiva con la cadena false', () => {
      const dto = transformar({ sincronizar: 'false' });

      expect(dto.sincronizar).toBe(false);
    });

    it('sigue activado con la cadena true', () => {
      const dto = transformar({ sincronizar: 'true' });

      expect(dto.sincronizar).toBe(true);
    });

    it('mantiene un valor booleano ya resuelto', () => {
      expect(transformar({ sincronizar: false }).sincronizar).toBe(false);
      expect(transformar({ sincronizar: true }).sincronizar).toBe(true);
    });

    it('se desactiva tambien con FALSE en mayusculas', () => {
      const dto = transformar({ sincronizar: 'FALSE' });

      expect(dto.sincronizar).toBe(false);
    });

    it('es un campo opcional, asi que la validacion lo acepta ausente', async () => {
      const errores = await validate(transformar({}));

      expect(errores).toHaveLength(0);
    });
  });

  describe('otros parametros', () => {
    it('usa page 1, per_page 20 y status any por defecto', () => {
      const dto = transformar({});

      expect(dto.page).toBe(1);
      expect(dto.per_page).toBe(20);
      expect(dto.status).toBe('any');
    });

    it('convierte page y per_page de cadena a numero', () => {
      const dto = transformar({ page: '3', per_page: '50' });

      expect(dto.page).toBe(3);
      expect(dto.per_page).toBe(50);
    });

    it('convierte per_page a la pagina segun corresponde', () => {
      const dto = transformar({ per_page: '100' });

      expect(dto.per_page).toBe(100);
    });

    it('rechaza una page menor que 1', async () => {
      const errores = await validate(transformar({ page: '0' }));

      expect(errores.length).toBeGreaterThan(0);
      expect(errores[0].constraints).toHaveProperty('min');
    });

    it('rechaza un status fuera de los permitidos', async () => {
      const errores = await validate(transformar({ status: 'borrador' }));

      expect(errores.length).toBeGreaterThan(0);
      expect(errores[0].constraints).toHaveProperty('isIn');
    });

    it('acepta un status valido', async () => {
      const errores = await validate(transformar({ status: 'publish' }));

      expect(errores).toHaveLength(0);
    });

    it('permite omitir search', async () => {
      const errores = await validate(transformar({}));

      expect(errores).toHaveLength(0);
    });
  });
});
