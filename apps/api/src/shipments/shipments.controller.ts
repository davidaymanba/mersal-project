import { Controller, Get, Param, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  CancelShipmentSchema,
  CreateShipmentSchema,
  PageQuerySchema,
  ShipmentStatus,
} from '@mersal/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody, ZodQuery } from '../common/zod';
import { MAX_UPLOAD_BYTES, type UploadedFileLike } from '../storage/storage.service';
import { ShipmentsService } from './shipments.service';

const statusList = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',') : undefined))
  .pipe(
    z
      .array(z.enum(Object.values(ShipmentStatus) as [ShipmentStatus, ...ShipmentStatus[]]))
      .optional(),
  );

const MyShipmentsQuery = PageQuerySchema.extend({
  role: z.enum(['sender', 'traveller']).default('sender'),
  status: statusList,
});

@ApiTags('shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Post()
  @ApiZodBody(CreateShipmentSchema)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(CreateShipmentSchema) body: z.output<typeof CreateShipmentSchema>,
    @Req() req: Request,
  ) {
    return this.shipments.create(user, body, requestMeta(req));
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(MyShipmentsQuery) query: z.output<typeof MyShipmentsQuery>,
  ) {
    return this.shipments.listForUser(user.id, query.role, query.status, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shipments.view(user, id);
  }

  @Post(':id/photos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photos: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @UseInterceptors(FilesInterceptor('photos', 4, { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  photos(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFiles() files: UploadedFileLike[],
  ) {
    return this.shipments.addPhotos(user, id, files ?? []);
  }

  @Post(':id/cancel')
  @ApiZodBody(CancelShipmentSchema)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(CancelShipmentSchema) body: z.output<typeof CancelShipmentSchema>,
    @Req() req: Request,
  ) {
    return this.shipments.cancel(user, id, body.reason, requestMeta(req));
  }
}

const AdminShipmentsQuery = PageQuerySchema.extend({
  status: z.enum(Object.values(ShipmentStatus) as [ShipmentStatus, ...ShipmentStatus[]]).optional(),
  corridorId: z.string().optional(),
  q: z.string().trim().max(100).optional(),
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/shipments')
export class AdminShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get()
  list(@ZodQuery(AdminShipmentsQuery) query: z.output<typeof AdminShipmentsQuery>) {
    return this.shipments.adminList(query, query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.shipments.adminView(id);
  }
}
