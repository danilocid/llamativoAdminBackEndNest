import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  /** Devuelve todos los parámetros de configuración. */
  async getAllSettings() {
    const settings = await this.settingRepository.find({ order: { id: 'ASC' } });

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Configuraciones obtenidas.',
      data: settings,
    };
  }

  /** Devuelve el valor de un parámetro por su clave, o null si no existe. */
  async getValue(name: string): Promise<string | null> {
    const setting = await this.settingRepository.findOne({ where: { name } });
    return setting?.parameter ?? null;
  }

  /** Crea un nuevo parámetro de configuración. */
  async createSetting(dto: CreateSettingDto) {
    const exists = await this.settingRepository.findOne({
      where: { name: dto.name },
    });

    if (exists) {
      throw new BadRequestException(`El parámetro "${dto.name}" ya existe.`);
    }

    const setting = await this.settingRepository.save(
      this.settingRepository.create(dto),
    );

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Parámetro creado.',
      data: setting,
    };
  }

  /** Actualiza el valor de un parámetro (lo crea si no existía). */
  async updateSetting(name: string, dto: UpdateSettingDto) {
    const setting = await this.settingRepository.findOne({ where: { name } });

    if (!setting) {
      // Upsert: permite configurar parámetros nuevos sin paso previo de creación.
      const created = await this.settingRepository.save(
        this.settingRepository.create({ name, parameter: dto.parameter }),
      );

      return {
        serverResponseCode: 200,
        serverResponseMessage: 'Parámetro creado.',
        data: created,
      };
    }

    setting.parameter = dto.parameter;
    const updated = await this.settingRepository.save(setting);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Parámetro actualizado.',
      data: updated,
    };
  }

  /** Elimina un parámetro de configuración. */
  async deleteSetting(name: string) {
    const setting = await this.settingRepository.findOne({ where: { name } });

    if (!setting) {
      throw new NotFoundException(`El parámetro "${name}" no existe.`);
    }

    await this.settingRepository.remove(setting);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Parámetro eliminado.',
      data: { name },
    };
  }
}
