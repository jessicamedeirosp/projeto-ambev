import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, RedisService],
})
export class UsersModule { }
