import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfig } from '../config/config.module';
import { renderMail, type MailLocale, type MailTemplate } from './templates';

export interface SendMailInput {
  to: string;
  template: MailTemplate;
  locale: string;
  vars?: Record<string, string>;
  code?: string;
  cta?: { label: string; url: string };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter;

  constructor(private readonly config: AppConfig) {
    this.transport = createTransport({
      host: config.env.SMTP_HOST,
      port: config.env.SMTP_PORT,
      secure: false,
    });
  }

  /** Sends an email; failures are logged, not thrown, so a mail outage never blocks a user action. */
  async send(input: SendMailInput): Promise<boolean> {
    const locale = (['en', 'fr', 'ar'].includes(input.locale) ? input.locale : 'en') as MailLocale;
    const mail = renderMail(input.template, locale, input.vars ?? {}, {
      code: input.code,
      cta: input.cta,
    });
    try {
      await this.transport.sendMail({ from: this.config.env.MAIL_FROM, to: input.to, ...mail });
      return true;
    } catch (error) {
      this.logger.error(
        `Could not send "${input.template}" to ${input.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
