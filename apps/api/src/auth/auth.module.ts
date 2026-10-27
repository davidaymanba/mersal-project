import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, RolesGuard } from './guards';
import { OneTimeCodeService } from './one-time-code.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OneTimeCodeService, JwtAuthGuard, RolesGuard],
  exports: [TokenService, OneTimeCodeService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
