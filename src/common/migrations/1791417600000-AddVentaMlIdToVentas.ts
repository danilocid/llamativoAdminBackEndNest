import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVentaMlIdToVentas1791417600000 implements MigrationInterface {
  name = 'AddVentaMlIdToVentas1791417600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotente: la columna puede haberse creado a mano para desbloquear
    // el error "Unknown column 'Sales.venta_ml_id' in 'field list'"
    const existing = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ventas'
        AND COLUMN_NAME = 'venta_ml_id'
    `);

    if (Number(existing?.[0]?.total ?? 0) === 0) {
      await queryRunner.query(`ALTER TABLE ventas ADD COLUMN venta_ml_id INT NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ventas'
        AND COLUMN_NAME = 'venta_ml_id'
    `);

    if (Number(existing?.[0]?.total ?? 0) > 0) {
      await queryRunner.query(`ALTER TABLE ventas DROP COLUMN venta_ml_id`);
    }
  }
}
