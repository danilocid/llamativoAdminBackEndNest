import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `color` a `notifications` para almacenar la
 * criticidad de cada notificación (success/warning/danger/info).
 * El valor se asigna automáticamente al insertar
 * (NotificationsColorSubscriber).
 */
export class AddColorToNotifications1794589425244
  implements MigrationInterface
{
  name = 'AddColorToNotifications1794589425244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotente: en dev la columna puede existir ya (DB_SYNCHRONIZE).
    const existing = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notifications'
        AND COLUMN_NAME = 'color'
    `);

    if (Number(existing?.[0]?.total ?? 0) === 0) {
      await queryRunner.query(`
        ALTER TABLE notifications
        ADD COLUMN color VARCHAR(20) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notifications'
        AND COLUMN_NAME = 'color'
    `);

    if (Number(existing?.[0]?.total ?? 0) > 0) {
      await queryRunner.query(`
        ALTER TABLE notifications
        DROP COLUMN color
      `);
    }
  }
}
