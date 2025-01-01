import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('articulos')
export class Products {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 191, unique: true })
  cod_interno: string;

  @Column({ type: 'varchar', length: 191, unique: true })
  cod_barras: string;

  @Column({ type: 'varchar', length: 191 })
  descripcion: string;

  @Column({ type: 'int' })
  costo_neto: number;

  @Column({ type: 'int' })
  costo_imp: number;

  @Column({ type: 'int' })
  venta_neto: number;

  @Column({ type: 'int' })
  venta_imp: number;

  @Column({ type: 'int' })
  stock: number;

  @Column({ type: 'int' })
  stock_critico: number;

  @Column({ type: 'boolean' })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_cont: Date;

  @Column({ type: 'boolean', default: false })
  publicado: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true, default: null })
  enlace_ml: string;
  @Column({ type: 'varchar', length: 120, nullable: true, default: null })
  id_ml: string;

  @Column({ type: 'varchar', length: 120, nullable: true, default: null })
  id_variante_ml: string;

  @Column({ type: 'boolean', default: false })
  publicado_ps: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true, default: null })
  id_ps: string;

  @Column({ type: 'varchar', length: 120, nullable: true, default: null })
  enlace_ps: string;
}
