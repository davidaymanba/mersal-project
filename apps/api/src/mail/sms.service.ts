import { Injectable, Logger } from '@nestjs/common';

/**
 * SMS gateway. Locally it only logs; a provider (Twilio, Vonage…) plugs in here
 * without changing callers.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(to: string, text: string): Promise<void> {
    this.logger.log(`SMS → ${to}: ${text}`);
  }
}
