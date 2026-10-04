import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  ObjectLiteral,
  UpdateEvent,
} from 'typeorm';

/**
 * Garantiza que createdAt/updatedAt se escriban siempre con la hora actual
 * del proceso Node (TZ=America/Santiago), sin depender del DEFAULT /
 * ON UPDATE CURRENT_TIMESTAMP del servidor MySQL, cuya zona horaria no
 * controlamos y puede no ser la de Chile.
 *
 * Cubre todos los save() (insert y update). El único repository.update()
 * del código (products.service) ya setea updatedAt manualmente.
 */
@EventSubscriber()
export class TimestampsSubscriber
  implements EntitySubscriberInterface<ObjectLiteral>
{
  beforeInsert(event: InsertEvent<ObjectLiteral>): void {
    const now = new Date();
    this.setIfEmpty(
      event.entity,
      event.metadata.createDateColumn?.propertyName,
      now,
    );
    this.setIfEmpty(
      event.entity,
      event.metadata.updateDateColumn?.propertyName,
      now,
    );
  }

  beforeUpdate(event: UpdateEvent<ObjectLiteral>): void {
    const propertyName = event.metadata.updateDateColumn?.propertyName;
    if (event.entity && propertyName) {
      event.entity[propertyName] = new Date();
    }
  }

  private setIfEmpty(
    entity: ObjectLiteral | undefined,
    propertyName: string | undefined,
    value: Date,
  ): void {
    if (!entity || !propertyName) return;
    const current = entity[propertyName];
    if (current === undefined || current === null) {
      entity[propertyName] = value;
    }
  }
}
