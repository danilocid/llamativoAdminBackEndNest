import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
@ApiTags('Notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  // get all notifications
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getNotifications() {
    return await this.notificationsService.getNotifications();
  }

  // create a notification
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
        },
      },
    },
  })
  async createNotification(@Body() notification: CreateNotificationDto) {
    console.log(notification);
    return await this.notificationsService.createNotification(notification);
  }

  // mark notification as readed
  @Post('readed/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'id',
    description: 'Notification id',
    example: 1,
  })
  async markAsReaded(@Param('id') id: number) {
    return await this.notificationsService.markAsReaded(id);
  }
}
