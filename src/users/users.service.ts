import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: createUserDto,
    });

    await this.redisService.set(`user:${user.id}`, JSON.stringify(user));

    return user;
  }

  async findAll(): Promise<User[]> {
    const cacheKey = 'all_users';
    const cachedUsers = await this.redisService.get(cacheKey);

    if (cachedUsers) {
      return JSON.parse(cachedUsers);
    }

    const users = await this.prisma.user.findMany();
    await this.redisService.set(cacheKey, JSON.stringify(users));

    return users;
  }

  async findOne(id: string) {
    const cachedUser = await this.redisService.get(`user:${id}`);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (user) {
      await this.redisService.set(`user:${user.id}`, JSON.stringify(user));
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    await this.redisService.set(
      `user:${updatedUser.id}`,
      JSON.stringify(updatedUser),
    );

    return updatedUser;
  }

  async remove(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    await this.redisService.del(`user:${id}`);
  }
}
