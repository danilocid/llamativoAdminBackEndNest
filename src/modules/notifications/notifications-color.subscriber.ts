import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { Notification } from './entities/notification.entity';

/** Notificación no crítica → verde. */
const COLOR_OK = 'success';
/** Error crítico → rojo. */
const COLOR_CRITICO = 'danger';
/** Aviso más crítico → amarillo. */
const COLOR_AVISO = 'warning';
/** Exclusivo de nuevas ventas de Mercado Libre → celeste. */
const COLOR_VENTA_ML = 'info';

/**
 * Títulos de aviso (más críticos que lo normal, pero no errores).
 * Se comparan en minúsculas contra el título de la notificación.
 */
const TITULOS_AVISO = [
  'no publicado',
  'propiedad faltante',
  'stock diferente',
  'precio diferente',
  'no encontrado',
];

/**
 * Clasifica el color de criticidad de cada notificación al crearla.
 *
 * - info (celeste): exclusivo de las nuevas ventas de Mercado Libre
 *   (títulos "Venta ML vinculada" / "Venta ML pendiente")
 * - danger (rojo): errores críticos (títulos que empiezan con "error")
 * - warning (amarillo): avisos (publicación, stock, precio, búsquedas)
 * - success (verde): el resto (no críticas)
 *
 * Se registra como subscriber de TypeORM en DatabaseModule para que aplique
 * a TODAS las vías de creación (servicio de notificaciones, productos,
 * compras y Mercado Libre), igual que NotificationsDedupSubscriber.
 *
 * Si la notificación ya trae `color` (DTO explícito), se respeta.
 */
@EventSubscriber()
export class NotificationsColorSubscriber
  implements EntitySubscriberInterface<Notification>
{
  listenTo(): typeof Notification {
    return Notification;
  }

  /** Asigna el color antes de insertar cuando no viene definido. */
  beforeInsert(event: InsertEvent<Notification>): void {
    const entity = event.entity;
    if (!entity || entity.color || !entity.title) {
      return;
    }
    entity.color = this.classificar(entity.title);
  }

  /** Reglas de clasificación (las mismas que usa el front como fallback). */
  private classificar(title: string): string {
    const titulo = title.trim().toLowerCase();

    // Celeste: solo nuevas ventas de Mercado Libre
    if (titulo.startsWith('venta ml')) {
      return COLOR_VENTA_ML;
    }

    // Rojo: errores críticos
    if (titulo.startsWith('error')) {
      return COLOR_CRITICO;
    }

    // Amarillo: avisos más críticos
    if (TITULOS_AVISO.some((aviso) => titulo.includes(aviso))) {
      return COLOR_AVISO;
    }

    // Verde: no críticas
    return COLOR_OK;
  }
}
