import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { ApiZodBody, ZodBody } from '../common/zod';
import { MessagingService } from './messaging.service';

const SendMessageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

@ApiTags('messages')
@ApiBearerAuth()
@Controller('shipments/:id/messages')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.messaging.list(user, id);
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiZodBody(SendMessageSchema)
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(SendMessageSchema) body: z.output<typeof SendMessageSchema>,
  ) {
    return this.messaging.send(user, id, body.body);
  }

  @Post('read')
  @HttpCode(204)
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.messaging.markRead(user, id);
  }
}

@ApiTags('messages')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly messaging: MessagingService) {}

  /** The signed-in user's message inbox. */
  @Get()
  inbox(@CurrentUser() user: AuthUser) {
    return this.messaging.inbox(user);
  }
}
