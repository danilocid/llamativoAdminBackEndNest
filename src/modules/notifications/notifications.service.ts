import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';
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

  async deleteReadedNtoifications() {
    // Delete all readed notifications, where readed is true and readedAt is 1 week old
    console.warn('Deleting readed notifications');
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const notificationsDeleted = await this.notificationRepository.delete({
      readed: true,
      readedAt: LessThan(date),
    });
    console.warn('Deleted notifications:', notificationsDeleted);
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
    this.deleteReadedNtoifications();
    return {
      serverResponseCode: 200,
      serverResponseMessage: 'Notificación marcada como leída.',
      data: notification,
    };
  }
}
