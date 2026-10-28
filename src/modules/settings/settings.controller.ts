import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { TelegramService } from './telegram.service';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';

@Controller('settings')
@ApiTags('Settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly telegramService: TelegramService,
  ) {}

  // get all settings
  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllSettings() {
    return await this.settingsService.getAllSettings();
  }

  // create a setting
  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateSettingDto })
  async createSetting(@Body() dto: CreateSettingDto) {
    return await this.settingsService.createSetting(dto);
  }

  // send a test message to the configured Telegram chat
  @Post('telegram/test')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async sendTestTelegram() {
    return await this.telegramService.sendTestMessage();
  }

  // update a setting value (creates it when it does not exist)
  @Put(':name')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'name', description: 'Clave del parámetro', example: 'telegram_chat_id' })
  @ApiBody({ type: UpdateSettingDto })
  async updateSetting(@Param('name') name: string, @Body() dto: UpdateSettingDto) {
    return await this.settingsService.updateSetting(name, dto);
  }

  // delete a setting
  @Delete(':name')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'name', description: 'Clave del parámetro', example: 'telegram_chat_id' })
  async deleteSetting(@Param('name') name: string) {
    return await this.settingsService.deleteSetting(name);
  }
}
