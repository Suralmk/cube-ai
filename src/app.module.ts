import './env.loader';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandModule } from './modules/brand/brand.module';
import { GenerationModule } from './modules/generation/generation.module';
import { HealthModule } from './modules/health/health.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { RagModule } from './modules/rag/rag.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationModule } from './modules/organization/organization.modules';
// better auth
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth';
@Module({
  imports: [
    DbModule,
    ConfigModule,
    BetterAuthModule.forRoot({ auth }),
    HealthModule,
    AuthModule,
    UsersModule,
    BrandModule,
    KnowledgeModule,
    RagModule,
    GenerationModule,
    StorageModule,
    OrganizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
