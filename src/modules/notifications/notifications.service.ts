import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
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
        url: notification.url,
        readed: notification.readed,
      });
    });
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificaciones obtenidas.',
      data: notificationsFiltered,
    };
  }

  async createNotification(notification) {
    notification = await this.notificationRepository.save(notification);

    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificación creada.',
      data: notification,
    };
  }
}
