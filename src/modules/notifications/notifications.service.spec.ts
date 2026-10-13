import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { GoogleLoggingService } from '../../common/services/google-logging.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotificationRepository: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  };

  const mockGoogleLoggingService: any = {
    log: jest.fn().mockImplementation(async () => undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        { provide: GoogleLoggingService, useValue: mockGoogleLoggingService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);

    // Se reasignan en cada test porque jest.clearAllMocks() limpia las
    // llamadas pero no las implementaciones
    mockNotificationRepository.find.mockResolvedValue([]);
    mockNotificationRepository.findOne.mockResolvedValue(null);
    mockNotificationRepository.save.mockImplementation(async (n: any) => n);
    mockNotificationRepository.count.mockResolvedValue(0);
    mockNotificationRepository.delete.mockResolvedValue({ affected: 0 });
    mockNotificationRepository.clear.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getNotifications
  // ---------------------------------------------------------------------------
  describe('getNotifications', () => {
    it('devuelve solo los campos permitidos, sin readedAt ni updatedAt', async () => {
      mockNotificationRepository.find.mockResolvedValue([
        {
          id: 1,
          title: 'Titulo',
          description: 'Descripcion',
          readed: false,
          readedAt: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-02-01'),
          url: '/articulos',
        },
      ]);

      const result = await service.getNotifications();

      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual([
        {
          id: 1,
          title: 'Titulo',
          description: 'Descripcion',
          readed: false,
          createdAt: new Date('2026-01-01'),
          url: '/articulos',
        },
      ]);
      expect(result.data[0]).not.toHaveProperty('readedAt');
      expect(result.data[0]).not.toHaveProperty('updatedAt');
    });

    it('devuelve una lista vacia cuando no hay notificaciones', async () => {
      const result = await service.getNotifications();

      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // createNotification
  // ---------------------------------------------------------------------------
  describe('createNotification', () => {
    it('guarda la notificacion y aplica el limite', async () => {
      const dto = { title: 'Nueva', description: 'Detalle', readed: false };

      const result = await service.createNotification(dto as any);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(dto);
      expect(mockNotificationRepository.count).toHaveBeenCalled();
      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toEqual(dto);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteReadedNotifications
  // ---------------------------------------------------------------------------
  describe('deleteReadedNotifications', () => {
    it('elimina las notificaciones con mas de una semana de antiguedad', async () => {
      await service.deleteReadedNotifications();

      expect(mockNotificationRepository.delete).toHaveBeenCalledWith({
        createdAt: expect.anything(),
      });
    });

    it('aplica el limite de notificaciones despues de eliminar', async () => {
      mockNotificationRepository.count.mockResolvedValue(10);

      await service.deleteReadedNotifications();

      expect(mockNotificationRepository.count).toHaveBeenCalled();
      expect(mockGoogleLoggingService.log).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // limitNotifications
  // ---------------------------------------------------------------------------
  describe('limitNotifications', () => {
    it('no elimina nada cuando hay 30 notificaciones o menos', async () => {
      mockNotificationRepository.count.mockResolvedValue(30);

      await service.limitNotifications();

      expect(mockNotificationRepository.find).not.toHaveBeenCalled();
      expect(mockNotificationRepository.delete).not.toHaveBeenCalled();
    });

    it('elimina las mas antiguas cuando se supera el limite', async () => {
      mockNotificationRepository.count.mockResolvedValue(33);
      mockNotificationRepository.find.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);

      await service.limitNotifications();

      expect(mockNotificationRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        take: 3,
      });
      expect(mockNotificationRepository.delete).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('no elimina nada si el repositorio no devuelve candidatas', async () => {
      mockNotificationRepository.count.mockResolvedValue(33);
      mockNotificationRepository.find.mockResolvedValue([]);

      await service.limitNotifications();

      expect(mockNotificationRepository.delete).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // markAsReaded
  // ---------------------------------------------------------------------------
  describe('markAsReaded', () => {
    it('devuelve 404 cuando la notificacion no existe', async () => {
      const result = await service.markAsReaded(999);

      expect(result.serverResponseCode).toBe(404);
      expect(result.data).toBeNull();
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
    });

    it('marca como leida una notificacion que no lo estaba', async () => {
      mockNotificationRepository.findOne.mockResolvedValue({
        id: 1,
        title: 'Titulo',
        readed: false,
      });

      const result = await service.markAsReaded(1);

      expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, readed: true }),
      );
      expect(result.serverResponseCode).toBe(200);
      expect(result.data.readed).toBe(true);
    });

    it('no vuelve a guardar si la notificacion ya estaba leida', async () => {
      mockNotificationRepository.findOne.mockResolvedValue({
        id: 1,
        title: 'Titulo',
        readed: true,
      });

      const result = await service.markAsReaded(1);

      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
      expect(result.serverResponseCode).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteAllNotifications
  // ---------------------------------------------------------------------------
  describe('deleteAllNotifications', () => {
    it('limpia todas las notificaciones', async () => {
      const result = await service.deleteAllNotifications();

      expect(mockNotificationRepository.clear).toHaveBeenCalled();
      expect(result.serverResponseCode).toBe(200);
      expect(result.data).toBeNull();
    });
  });
});
