import { Controller, Get, Param, Post, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  PageQuerySchema,
  RejectVerificationSchema,
  SubmitVerificationSchema,
} from '@mersal/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody, ZodQuery } from '../common/zod';
import { MAX_UPLOAD_BYTES } from '../storage/storage.service';
import { VerificationService, type VerificationFiles } from './verification.service';

@ApiTags('verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['documentType', 'documentCountry', 'documentFront', 'selfie'],
      properties: {
        documentType: {
          type: 'string',
          enum: ['PASSPORT', 'NATIONAL_ID', 'RESIDENCE_PERMIT', 'DRIVING_LICENSE'],
        },
        documentCountry: { type: 'string', example: 'FR' },
        documentFront: { type: 'string', format: 'binary' },
        documentBack: { type: 'string', format: 'binary' },
        selfie: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'documentFront', maxCount: 1 },
        { name: 'documentBack', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_UPLOAD_BYTES } },
    ),
  )
  submit(
    @CurrentUser() user: AuthUser,
    @ZodBody(SubmitVerificationSchema) body: z.output<typeof SubmitVerificationSchema>,
    @UploadedFiles() files: VerificationFiles,
    @Req() req: Request,
  ) {
    return this.verification.submit(user, body, files ?? {}, requestMeta(req));
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.verification.mine(user.id);
  }
}

const AdminListQuery = PageQuerySchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/verifications')
export class AdminVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  list(@ZodQuery(AdminListQuery) query: z.output<typeof AdminListQuery>) {
    return this.verification.list(query.status, query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.verification.get(id);
  }

  @Post(':id/approve')
  approve(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Req() req: Request) {
    return this.verification.approve(admin.id, id, requestMeta(req));
  }

  @Post(':id/reject')
  @ApiZodBody(RejectVerificationSchema)
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @ZodBody(RejectVerificationSchema) body: z.output<typeof RejectVerificationSchema>,
    @Req() req: Request,
  ) {
    return this.verification.reject(admin.id, id, body.reason, requestMeta(req));
  }
}
