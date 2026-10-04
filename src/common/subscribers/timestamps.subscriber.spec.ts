import { TimestampsSubscriber } from './timestamps.subscriber';

describe('TimestampsSubscriber', () => {
  const subscriber = new TimestampsSubscriber();

  const metadata = {
    createDateColumn: { propertyName: 'createdAt' },
    updateDateColumn: { propertyName: 'updatedAt' },
  } as any;

  it('asigna createdAt y updatedAt en insert cuando faltan', () => {
    const entity: Record<string, unknown> = {};
    subscriber.beforeInsert({ entity, metadata } as any);

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });

  it('no pisa un createdAt definido en el insert', () => {
    const fecha = new Date('2020-01-01T00:00:00.000Z');
    const entity: Record<string, unknown> = { createdAt: fecha };
    subscriber.beforeInsert({ entity, metadata } as any);

    expect(entity.createdAt).toBe(fecha);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });

  it('asigna solo createdAt en entidades sin updatedAt (createDateColumn ausente)', () => {
    const entity: Record<string, unknown> = {};
    subscriber.beforeInsert({
      entity,
      metadata: { createDateColumn: { propertyName: 'createdAt' } },
    } as any);

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeUndefined();
  });

  it('actualiza updatedAt en el update aunque tenga valor anterior', () => {
    const entity: Record<string, unknown> = {
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      updatedAt: new Date('2020-06-01T00:00:00.000Z'),
    };
    subscriber.beforeUpdate({ entity, metadata } as any);

    expect(entity.updatedAt).toBeInstanceOf(Date);
    expect((entity.updatedAt as Date).getTime()).toBeGreaterThan(
      new Date('2020-06-01T00:00:00.000Z').getTime(),
    );
  });

  it('no falla con entity undefined en update', () => {
    expect(() =>
      subscriber.beforeUpdate({ entity: undefined, metadata } as any),
    ).not.toThrow();
  });
});
