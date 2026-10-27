import { Controller, Get, Param, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  DisputeStatus,
  OpenDisputeSchema,
  PageQuerySchema,
  ResolveDisputeSchema,
} from '@mersal/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody, ZodQuery } from '../common/zod';
import { MAX_UPLOAD_BYTES, type UploadedFileLike } from '../storage/storage.service';
import { DisputesService } from './disputes.service';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('shipments/:id/disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  /** Sender reports a problem (multipart: reason, description, up to 4 photos). */
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('evidence', 4, { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  open(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(OpenDisputeSchema) body: z.output<typeof OpenDisputeSchema>,
    @UploadedFiles() files: UploadedFileLike[],
    @Req() req: Request,
  ) {
    return this.disputes.open(user, id, body, files ?? [], requestMeta(req));
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.disputes.forShipment(user, id);
  }
}

const DisputesQuery = PageQuerySchema.extend({
  status: z.enum(Object.values(DisputeStatus) as [DisputeStatus, ...DisputeStatus[]]).optional(),
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  list(@ZodQuery(DisputesQuery) query: z.output<typeof DisputesQuery>) {
    return this.disputes.list(query.status, query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.disputes.get(id);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.disputes.startReview(admin.id, id);
  }

  @Post(':id/resolve')
  @ApiZodBody(ResolveDisputeSchema)
  resolve(
    @Param('id') id: string,
    @ZodBody(ResolveDisputeSchema) body: z.output<typeof ResolveDisputeSchema>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    return this.disputes.resolve(admin.id, id, body, requestMeta(req));
  }
}
