import { describe, expect, it } from '@jest/globals';
import { NotificationsColorSubscriber } from './notifications-color.subscriber';
import { Notification } from './entities/notification.entity';

describe('NotificationsColorSubscriber', () => {
  const subscriber = new NotificationsColorSubscriber();

  const buildEvent = (entity: any): any => ({ entity });

  const clasificar = (entity: any): any => {
    subscriber.beforeInsert(buildEvent(entity));
    return entity;
  };

  it('está definido', () => {
    expect(subscriber).toBeDefined();
  });

  it('escucha la entidad Notification', () => {
    expect(subscriber.listenTo()).toBe(Notification);
  });

  it('asigna info (celeste) solo a las ventas de Mercado Libre', () => {
    expect(clasificar({ title: 'Venta ML vinculada' }).color).toBe('info');
    expect(clasificar({ title: 'Venta ML pendiente' }).color).toBe('info');
    expect(clasificar({ title: 'VENTA ML VINCULADA' }).color).toBe('info');
  });

  it('asigna danger (rojo) a los errores criticos', () => {
    expect(clasificar({ title: 'Error en scraping RCV' }).color).toBe('danger');
    expect(clasificar({ title: 'error de conexion' }).color).toBe('danger');
  });

  it('asigna warning (amarillo) a los avisos', () => {
    const avisos = [
      'Producto no publicado',
      'Producto con propiedad faltante',
      'Stock diferente: Polera',
      'Precio diferente: Polera',
      'Producto no encontrado',
    ];
    for (const title of avisos) {
      expect(clasificar({ title }).color).toBe('warning');
    }
  });

  it('asigna success (verde) al resto de las notificaciones', () => {
    expect(
      clasificar({ title: 'Compra registrada exitosamente' }).color,
    ).toBe('success');
    expect(clasificar({ title: 'No hay compras para el mes en curso' }).color).toBe(
      'success',
    );
  });

  it('respeta un color ya definido (no lo pisa)', () => {
    const entity = clasificar({ title: 'Error en scraping RCV', color: 'info' });
    expect(entity.color).toBe('info');
  });

  it('no hace nada si falta el titulo', () => {
    const entity = clasificar({ description: 'sin titulo' });
    expect(entity.color).toBeUndefined();
  });
});
