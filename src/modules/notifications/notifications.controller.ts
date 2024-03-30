import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getNotifications() {
    return await this.notificationsService.getNotifications();
  }
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    description: 'Create notification',
    type: CreateNotificationDto,
    examples: {
      notification: {
        description: 'Create notification',
        value: {
          title: 'Notification title',
          description: 'Notification description',
          url: 'Notification url',
        },
      },
    },
  })
  async createNotification(@Body() notification: CreateNotificationDto) {
    console.log(notification);
    return await this.notificationsService.createNotification(notification);
  }
}
