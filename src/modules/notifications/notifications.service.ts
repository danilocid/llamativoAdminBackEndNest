import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';
import { GoogleLoggingService } from '../../common/services/google-logging.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly googleLoggingService: GoogleLoggingService,
  ) {}
  async getNotifications() {
    const notifications = await this.notificationRepository.find();

    // Remove readedAt, createdAt and updatedAt fields
    const notificationsFiltered = [];
    notifications.forEach((notification) => {
      notificationsFiltered.push({
        id: notification.id,
        title: notification.title,
        description: notification.description,
        readed: notification.readed,
        createdAt: notification.createdAt,
        url: notification.url,
      });
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificaciones obtenidas.',
      data: notificationsFiltered,
    };
  }

  async createNotification(notification: CreateNotificationDto) {
    notification = await this.notificationRepository.save(notification);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificación creada.',
      data: notification,
    };
  }

  async deleteReadedNotifications() {
    // Delete all readed notifications, where readed is true and readedAt is 1 week old
    await this.googleLoggingService.log(
      'Deleting readed notifications',
      null,
      'WARNING',
      'deleteReadedNotifications',
      'notifications',
    );
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const notificationsDeleted = await this.notificationRepository.delete({
      createdAt: LessThan(date),
    });
    await this.googleLoggingService.log(
      'Deleted notifications',
      notificationsDeleted,
      'WARNING',
      'deleteReadedNotifications',
      'notifications',
    );
  }

  async markAsReaded(id: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      return {
        serverResponseCode: 404,
        serverResponseMessage: 'Notificación no encontrada.',
        data: null,
      };
    }
    if (notification.readed === false) {
      notification.readed = true;
      notification.readedAt = new Date();
      await this.notificationRepository.save(notification);
    }
    this.deleteReadedNotifications();
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificación marcada como leída.',
      data: notification,
    };
  }

  async deleteAllNotifications() {
    await this.googleLoggingService.log(
      'Eliminando todas las notificaciones',
      null,
      'WARNING',
      'deleteAllNotifications',
      'notifications',
    );
    await this.notificationRepository.clear();
    await this.googleLoggingService.log(
      'Todas las notificaciones han sido eliminadas',
      null,
      'WARNING',
      'deleteAllNotifications',
      'notifications',
    );

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Todas las notificaciones han sido eliminadas.',
      data: null,
    };
  }
}
