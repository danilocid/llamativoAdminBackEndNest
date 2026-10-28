import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SettingsService } from './settings.service';

/** Claves de configuración (almacenadas en la tabla `settings`). */
export const TELEGRAM_BOT_TOKEN = 'telegram_bot_token';
export const TELEGRAM_CHAT_ID = 'telegram_chat_id';

const TELEGRAM_API_TIMEOUT_MS = 10000;

/**
 * Envía mensajes a Telegram usando el bot configurado en
 * `settings` (telegram_bot_token / telegram_chat_id).
 *
 * Los fallos nunca interrumpen el flujo de negocio: se loguean y se
 * devuelve `false`.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Envía una notificación de negocio (ej: nueva venta ML o nueva compra)
   * al chat configurado. Devuelve false si Telegram no está configurado
   * o si el envío falla.
   */
  async sendNotification(title: string, description: string): Promise<boolean> {
    try {
      const token = await this.settingsService.getValue(TELEGRAM_BOT_TOKEN);
      const chatId = await this.settingsService.getValue(TELEGRAM_CHAT_ID);

      if (!token || !chatId) {
        this.logger.debug(
          'Telegram no configurado (falta telegram_bot_token o telegram_chat_id): se omite el envío.',
        );
        return false;
      }

      const text = `🔔 ${title}\n${description}`;

      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { chat_id: chatId, text },
        { timeout: TELEGRAM_API_TIMEOUT_MS },
      );

      this.logger.log(`Mensaje de Telegram enviado: ${title}`);
      return true;
    } catch (error: any) {
      // Nunca se incluye la URL de la petición: contiene el token del bot.
      const detalle =
        error?.response?.data?.description || error?.message || 'error desconocido';
      this.logger.warn(`No se pudo enviar el mensaje de Telegram: ${detalle}`);
      return false;
    }
  }

  /** Envía un mensaje de prueba al chat configurado. Falla con 400 si no está configurado o la API rechaza el envío. */
  async sendTestMessage() {
    const token = await this.settingsService.getValue(TELEGRAM_BOT_TOKEN);
    const chatId = await this.settingsService.getValue(TELEGRAM_CHAT_ID);

    if (!token || !chatId) {
      throw new BadRequestException(
        'Telegram no está configurado: completa telegram_bot_token y telegram_chat_id.',
      );
    }

    try {
      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text: '✅ SIVIG: configuración de Telegram verificada correctamente.',
        },
        { timeout: TELEGRAM_API_TIMEOUT_MS },
      );
    } catch (error: any) {
      const detalle =
        error?.response?.data?.description || error?.message || 'error desconocido';
      throw new BadRequestException(`Telegram rechazó el envío: ${detalle}`);
    }

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Mensaje de prueba enviado.',
      data: { chatId },
    };
  }
}
