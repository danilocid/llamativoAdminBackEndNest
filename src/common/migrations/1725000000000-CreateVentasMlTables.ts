import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVentasMlTables1725000000000 implements MigrationInterface {
  name = 'CreateVentasMlTables1725000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ventas_ml (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_envio_ml VARCHAR(255) NOT NULL UNIQUE,
        estado VARCHAR(255) NOT NULL,
        comprador_nombre VARCHAR(255) NOT NULL,
        comprador_email VARCHAR(255),
        monto_total INT NOT NULL,
        moneda VARCHAR(10) DEFAULT 'CLP',
        costo_envio INT,
        comision_ml INT,
        fecha_venta_ml DATETIME NOT NULL,
        fecha_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        venta_id INT,
        observaciones VARCHAR(191)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS detalles_ventas_ml (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_orden_ml VARCHAR(255) NOT NULL UNIQUE,
        venta_ml_id INT NOT NULL,
        productos JSON,
        monto_orden INT NOT NULL,
        fecha_orden_ml DATETIME NOT NULL,
        FOREIGN KEY (venta_ml_id) REFERENCES ventas_ml(id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS detalles_ventas_ml`);
    await queryRunner.query(`DROP TABLE IF EXISTS ventas_ml`);
  }
}
