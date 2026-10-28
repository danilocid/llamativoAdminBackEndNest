import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla `settings` (parámetros de configuración del sistema)
 * y deja sembrados los parámetros de Telegram.
 */
export class CreateSettingsTable1793059200000 implements MigrationInterface {
  name = 'CreateSettingsTable1793059200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotente: la tabla puede haber sido creada a mano (DB_SYNCHRONIZE en dev).
    const existing = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'settings'
    `);

    if (Number(existing?.[0]?.total ?? 0) === 0) {
      await queryRunner.query(`
        CREATE TABLE settings (
          id INT NOT NULL AUTO_INCREMENT,
          name VARCHAR(191) NOT NULL,
          parameter TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY UK_settings_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // Parámetros iniciales de Telegram (valores vacíos hasta que se configuren).
    const seeds: Array<[string, string]> = [
      ['telegram_bot_token', ''],
      ['telegram_chat_id', ''],
    ];

    for (const [name, parameter] of seeds) {
      await queryRunner.query(
        `INSERT IGNORE INTO settings (name, parameter) VALUES (?, ?)`,
        [name, parameter],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'settings'
    `);

    if (Number(existing?.[0]?.total ?? 0) > 0) {
      await queryRunner.query(`DROP TABLE settings`);
    }
  }
}
