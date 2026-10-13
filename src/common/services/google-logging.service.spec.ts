import { Test, TestingModule } from '@nestjs/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { GoogleLoggingService } from './google-logging.service';

const mockWrite: any = jest.fn();
const mockEntry: any = jest.fn();

jest.mock('@google-cloud/logging', () => ({
  Logging: jest.fn().mockImplementation(() => ({
    log: () => ({
      entry: mockEntry,
      write: mockWrite,
    }),
  })),
}));

describe('GoogleLoggingService', () => {
  let service: GoogleLoggingService;
  let envAnterior: string | undefined;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleLoggingService],
    }).compile();

    service = module.get<GoogleLoggingService>(GoogleLoggingService);

    envAnterior = process.env.ENV;
    mockEntry.mockReturnValue('entrada-google');
    mockWrite.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.ENV = envAnterior;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('usa method y service por defecto cuando no se proporcionan', async () => {
    await service.log('hola');

    expect(mockEntry).toHaveBeenCalledWith(expect.anything(), {
      message: 'hola',
      data: undefined,
      method: 'default-method',
      service: 'default-service',
    });
  });

  it('usa INFO como severidad por defecto', async () => {
    process.env.ENV = 'prod';

    await service.log('hola');

    expect(mockEntry).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'INFO' }),
      expect.anything(),
    );
  });

  it('en desarrollo solo escribe en consola y no envia a Google Cloud', async () => {
    process.env.ENV = 'dev';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await service.log('hola', { clave: 'valor' }, 'WARNING', 'metodo', 'servicio');

      expect(warn).toHaveBeenCalledWith(
        '[WARNING] [servicio] [metodo]: hola',
      );
      expect(warn).toHaveBeenCalledWith('Datos:', { clave: 'valor' });
      expect(mockWrite).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('no muestra los datos en consola cuando no se proporcionan', async () => {
    process.env.ENV = 'dev';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await service.log('hola', undefined, 'INFO', 'metodo', 'servicio');

      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('fuera de desarrollo envia la entrada a Google Cloud', async () => {
    process.env.ENV = 'prod';

    await service.log('hola', null, 'ERROR', 'metodo', 'servicio');

    expect(mockWrite).toHaveBeenCalledWith('entrada-google');
  });

  it('no propaga el error si falla el envio a Google Cloud', async () => {
    process.env.ENV = 'prod';
    const error = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockWrite.mockRejectedValueOnce(new Error('fallo de red'));

    try {
      await expect(service.log('hola')).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(
        'Error al enviar log a Google Cloud:',
        expect.any(Error),
      );
    } finally {
      error.mockRestore();
    }
  });
});
