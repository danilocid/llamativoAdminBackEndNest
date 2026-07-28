import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private folderId: string;

  constructor(private configService: ConfigService) {
    this.folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.configService.get<string>('GOOGLE_DRIVE_CLIENT_EMAIL'),
        private_key: this.configService.get<string>('GOOGLE_DRIVE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadImage(file: MulterFile, folder?: string) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Use: JPG, PNG, GIF o WEBP');
    }

    const folderId = folder ? await this.getOrCreateFolder(folder) : this.folderId;

    const fileMetadata: drive_v3.Schema$File = {
      name: `${Date.now()}-${file.originalname}`,
      parents: folderId ? [folderId] : undefined,
    };

    const media = {
      mimeType: file.mimetype,
      body: file.buffer,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size, createdTime',
    });

    // Hacer el archivo público para lectura
    await this.drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: `https://drive.google.com/uc?export=view&id=${response.data.id}`,
      mimeType: response.data.mimeType,
      size: response.data.size,
      createdTime: response.data.createdTime,
    };
  }

  async uploadFromBuffer(buffer: Buffer, fileName: string, mimeType: string, folder?: string) {
    const folderId = folder ? await this.getOrCreateFolder(folder) : this.folderId;

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    const media = {
      mimeType: mimeType,
      body: buffer,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size, createdTime',
    });

    await this.drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: `https://drive.google.com/uc?export=view&id=${response.data.id}`,
      mimeType: response.data.mimeType,
      size: response.data.size,
      createdTime: response.data.createdTime,
    };
  }

  async listImages(folder?: string, pageToken?: string) {
    const folderId = folder || this.folderId;

    let query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
    if (!folderId) {
      query = `mimeType contains 'image/' and trashed = false`;
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, webViewLink, webContentLink, mimeType, size, createdTime, thumbnailLink)',
      pageSize: 50,
      pageToken: pageToken,
      orderBy: 'createdTime desc',
    });

    const files = response.data.files.map((file) => ({
      ...file,
      webContentLink: `https://drive.google.com/uc?export=view&id=${file.id}`,
    }));

    return {
      files,
      nextPageToken: response.data.nextPageToken,
    };
  }

  async getImage(fileId: string) {
    const response = await this.drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size, createdTime, thumbnailLink',
    });

    return {
      ...response.data,
      webContentLink: `https://drive.google.com/uc?export=view&id=${response.data.id}`,
    };
  }

  async deleteImage(fileId: string) {
    await this.drive.files.delete({
      fileId: fileId,
    });

    return { deleted: true };
  }

  async createFolder(name: string, parentFolder?: string) {
    return this.getOrCreateFolder(name, parentFolder);
  }

  async listFolders(parentFolder?: string) {
    const folderId = parentFolder || this.folderId;

    let query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (!folderId) {
      query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    }

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime)',
      orderBy: 'name',
    });

    return response.data.files;
  }

  private async getOrCreateFolder(name: string, parentFolder?: string): Promise<string> {
    const parentId = parentFolder || this.folderId;

    // Buscar si ya existe la carpeta
    let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const existingFolders = await this.drive.files.list({
      q: query,
      fields: 'files(id)',
    });

    if (existingFolders.data.files.length > 0) {
      return existingFolders.data.files[0].id;
    }

    // Crear la carpeta si no existe
    const fileMetadata: drive_v3.Schema$File = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return response.data.id;
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
}
