import { Global, Module } from '@nestjs/common';
import { ConversationsController, MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Global()
@Module({
  controllers: [MessagingController, ConversationsController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
