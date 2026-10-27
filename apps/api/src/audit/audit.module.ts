import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditedInterceptor } from './audited.interceptor';

@Global()
@Module({
  providers: [AuditService, AuditedInterceptor],
  exports: [AuditService, AuditedInterceptor],
})
export class AuditModule {}
