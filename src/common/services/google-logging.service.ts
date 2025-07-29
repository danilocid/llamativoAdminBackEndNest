import { Injectable } from '@nestjs/common';
import { Logging } from '@google-cloud/logging';
import { LogSeverity } from '@google-cloud/logging/build/src/entry';

@Injectable()
export class GoogleLoggingService {
  private readonly googleLogger: Logging;

  constructor() {
    this.googleLogger = new Logging(); // Inicializar Google Cloud Logging
  }

  async log(
    message: string,
    data?: any,
    severity: LogSeverity = 'INFO',
    method?: string,
    service?: string,
  ) {
    /*  if (!method) {
      method = 'default-method'; // Método por defecto si no se proporciona
    }
    if (!service) {
      service = 'default-service'; // Servicio por defecto si no se proporciona
    }
    const log = this.googleLogger.log('application-log'); // Nombre del log
    const entry = log.entry(
      { resource: { type: 'global' }, severity }, // Etiquetas para el log
      { message, data, method, service }, // Datos adicionales
    ); */

    try {
      //await log.write(entry);
      console.log(`Log enviado a Google Cloud: ${message}`);
      console.log('Datos:', data);
    } catch (error) {
      console.error('Error al enviar log a Google Cloud:', error);
    }
  }
}
