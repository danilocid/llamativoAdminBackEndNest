import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { Notification } from './entities/notification.entity';

/**
 * Elimina las notificaciones duplicadas al crear una nueva.
 *
 * Una notificación es duplicada cuando otra ya existente tiene exactamente
 * el mismo texto: título y descripción idénticos. La comparación usa BINARY
 * porque la colación CI de MySQL no distingue mayúsculas ni acentos, y acá
 * se exige texto byte a byte igual.
 *
 * Se registra como subscriber de TypeORM en DatabaseModule para que aplique
 * a TODAS las vías de creación del sistema (servicio de notificaciones,
 * productos, compras y Mercado Libre), no solo a la del controller.
 */
@EventSubscriber()
export class NotificationsDedupSubscriber
  implements EntitySubscriberInterface<Notification>
{
  listenTo(): typeof Notification {
    return Notification;
  }

  /**
   * Después de insertar la notificación nueva, borra las anteriores con el
   * mismo texto. Usa `id < :id` (y no `id != :id`) para conservar siempre
   * la más reciente: ante dos inserciones simultáneas del mismo texto, cada
   * una solo elimina las anteriores a la suya y nunca se borran entre sí.
   *
   * TypeORM escribe el id generado antes de emitir este evento, por lo que
   * `entity.id` siempre está disponible en un save() normal.
   */
  async afterInsert(event: InsertEvent<Notification>): Promise<void> {
    const { entity, manager } = event;
    if (!entity || !entity.id || !entity.title || !entity.description) {
      return;
    }

    await manager
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where(
        'BINARY title = BINARY :title ' +
          'AND BINARY description = BINARY :description ' +
          'AND id < :id',
        { title: entity.title, description: entity.description, id: entity.id },
      )
      .execute();
  }
}
