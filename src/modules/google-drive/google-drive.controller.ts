import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { GoogleDriveService } from './google-drive.service';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('Google Drive')
@Controller('google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', description: 'Nombre de carpeta opcional' },
      },
    },
  })
  async uploadImage(
    @UploadedFile() file: MulterFile,
    @Body('folder') folder?: string,
  ) {
    return this.googleDriveService.uploadImage(file, folder);
  }

  @Get('list')
  @ApiQuery({ name: 'folder', required: false })
  @ApiQuery({ name: 'pageToken', required: false })
  async listImages(
    @Query('folder') folder?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    return this.googleDriveService.listImages(folder, pageToken);
  }

  @Get('folders')
  @ApiQuery({ name: 'parent', required: false })
  async listFolders(@Query('parent') parent?: string) {
    return this.googleDriveService.listFolders(parent);
  }

  @Post('folders')
  async createFolder(@Body('name') name: string, @Body('parent') parent?: string) {
    return this.googleDriveService.createFolder(name, parent);
  }

  @Get(':id')
  async getImage(@Param('id') id: string) {
    return this.googleDriveService.getImage(id);
  }

  @Delete(':id')
  async deleteImage(@Param('id') id: string) {
    return this.googleDriveService.deleteImage(id);
  }
}
