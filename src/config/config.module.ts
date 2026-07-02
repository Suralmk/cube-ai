import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv } from './validation.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: [
        '.env',
        `src/config/env/.env.${process.env.NODE_ENV ?? 'development'}`,
        'src/config/env/.env.development',
      ],
    }),
  ],
})
export class ConfigModule {}
