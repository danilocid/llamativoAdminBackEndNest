import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { InsertEvent } from 'typeorm';
import { NotificationsDedupSubscriber } from './notifications-dedup.subscriber';
import { Notification } from './entities/notification.entity';

describe('NotificationsDedupSubscriber', () => {
  let subscriber: NotificationsDedupSubscriber;

  // Cadena del QueryBuilder mockeada:
  // createQueryBuilder().delete().from().where().execute()
  const execute = jest.fn<() => Promise<{ affected: number | null }>>();
  const where = jest.fn<
    (
      sql: string,
      params: Record<string, unknown>,
    ) => { execute: typeof execute }
  >();
  const from = jest.fn<(table: unknown) => { where: typeof where }>();
  const deleteBuilder = jest.fn<() => { from: typeof from }>();
  const createQueryBuilder = jest.fn<() => { delete: typeof deleteBuilder }>();

  const buildEvent = (entity: any): InsertEvent<Notification> =>
    ({ entity, manager: { createQueryBuilder } }) as any;

  beforeEach(() => {
    jest.clearAllMocks();

    execute.mockResolvedValue({ affected: 0 });
    where.mockReturnValue({ execute });
    from.mockReturnValue({ where });
    deleteBuilder.mockReturnValue({ from });
    createQueryBuilder.mockReturnValue({ delete: deleteBuilder });

    subscriber = new NotificationsDedupSubscriber();
  });

  it('está definido', () => {
    expect(subscriber).toBeDefined();
  });

  it('escucha la entidad Notification', () => {
    expect(subscriber.listenTo()).toBe(Notification);
  });

  it('elimina las notificaciones anteriores con el mismo texto', async () => {
    await subscriber.afterInsert(
      buildEvent({
        id: 10,
        title: 'Sin stock',
        description: 'El producto X quedó sin stock.',
      }),
    );

    expect(createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(deleteBuilder).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith(Notification);
    expect(where).toHaveBeenCalledWith(
      expect.stringContaining('BINARY title = BINARY :title'),
      {
        title: 'Sin stock',
        description: 'El producto X quedó sin stock.',
        id: 10,
      },
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('pide borrar solo las anteriores (id < :id) para conservar la nueva', async () => {
    await subscriber.afterInsert(
      buildEvent({ id: 5, title: 'Titulo', description: 'Detalle' }),
    );

    const [sql] = where.mock.calls[0];
    expect(sql).toContain('BINARY description = BINARY :description');
    expect(sql).toContain('id < :id');
    expect(sql).not.toContain('id != :id');
  });

  it('no hace nada si la notificación no tiene id', async () => {
    await subscriber.afterInsert(
      buildEvent({ id: undefined, title: 'Titulo', description: 'Detalle' }),
    );

    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('no hace nada si falta el título o la descripción', async () => {
    await subscriber.afterInsert(
      buildEvent({ id: 1, title: '', description: 'Detalle' }),
    );
    await subscriber.afterInsert(
      buildEvent({ id: 2, title: 'Titulo', description: '' }),
    );

    expect(createQueryBuilder).not.toHaveBeenCalled();
  });
});
