import { NestFactory } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';

ConfigModule.forRoot({
  envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
});

async function bootstrap() {
  const app = await NestFactory.create(UsersModule, { cors: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
