import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { forbidden } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiQuery({ name: 'key', description: 'Storage key, e.g. users/<id>/kyc/<file>.jpg' })
  async download(
    @Query('key') key: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!(await this.canRead(user, key ?? '')))
      throw forbidden('forbidden', 'You cannot access this file');
    const file = await this.storage.open(key);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(file.stream, { type: file.contentType, length: file.size });
  }

  /** Access rules by key prefix. Admins can read everything. */
  private async canRead(user: AuthUser, key: string): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    const [scope, id] = key.split('/');
    if (!id) return false;
    switch (scope) {
      case 'users':
        return id === user.id;
      case 'shipments': {
        const shipment = await this.prisma.shipment.findUnique({
          where: { id },
          select: { senderId: true, travellerId: true },
        });
        return !!shipment && (shipment.senderId === user.id || shipment.travellerId === user.id);
      }
      default:
        return false;
    }
  }
}
