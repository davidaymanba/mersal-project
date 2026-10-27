import { Global, Injectable, Module } from '@nestjs/common';
import { Env, loadEnv } from './env';

@Injectable()
export class AppConfig {
  readonly env: Env = loadEnv();

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get demoMode(): boolean {
    return this.env.DEMO_MODE;
  }
}

@Global()
@Module({
  providers: [AppConfig],
  exports: [AppConfig],
})
export class ConfigModule {}
