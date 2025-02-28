import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import { HashingService } from '../hashing/hashing.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly hashingService: HashingService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('E-mail já está em uso por outro usuário');
    }

    const passwordHash = await this.hashingService.hash(createUserDto.password);

    const user = await this.prismaService.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password_hash: passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: false,
        created_at: true,
        updated_at: true
      }
    });

    await this.redisService.set(`user:${user.id}`, JSON.stringify(user));


    const cacheKey = 'all_users';
    const cachedUsers = await this.redisService.get(cacheKey);
    if (cachedUsers) {
      let users: User[] | null = await JSON.parse(cachedUsers);
      users = users || [];
      const newUsers = [...users, user];
      await this.redisService.set(cacheKey, JSON.stringify(newUsers));
    } else {
      await this.redisService.set(cacheKey, JSON.stringify([user]));
    }

    return user;
  }

  async findAll(): Promise<Omit<User, 'password_hash'>[]> {
    const cacheKey = 'all_users';
    const cachedUsers = await this.redisService.get(cacheKey);

    if (cachedUsers) {
      return JSON.parse(cachedUsers);
    }

    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: false,
        created_at: true,
        updated_at: true
      }
    });
    await this.redisService.set(cacheKey, JSON.stringify(users));

    return users;
  }

  async findOne(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const cachedUser = await this.redisService.get(`user:${id}`);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: false,
        created_at: true,
        updated_at: true
      }
    });

    if (user) {
      await this.redisService.set(`user:${user.id}`, JSON.stringify(user));
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password_hash'>> {

    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const userWithEmail = await this.prismaService.user.findUnique({
      where: {
        email: updateUserDto.email,
      },
    });

    if (userWithEmail && userWithEmail.id !== id) {
      throw new BadRequestException('E-mail já está em uso por outro usuário');
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
        password_hash: await this.hashingService.hash(updateUserDto.password)
      },
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: false,
        created_at: true,
        updated_at: true
      }
    });


    await this.redisService.set(
      `user:${updatedUser.id}`,
      JSON.stringify(updatedUser),
    );

    const cacheKey = 'all_users';
    const cachedUsers = await this.redisService.get(cacheKey);
    if (cachedUsers) {
      let users: User[] | null = await JSON.parse(cachedUsers);
      users = users || [];
      const newUsers = users.map(user => user.id === updatedUser.id ? updatedUser : user);
      await this.redisService.set(cacheKey, JSON.stringify(newUsers));
    } else {
      await this.redisService.set(cacheKey, JSON.stringify([updatedUser]));
    }

    return updatedUser;
  }


  async remove(id: string): Promise<void> {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id
      },
    });

    if (!existingUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    await this.prismaService.user.delete({
      where: { id },
    });

    const cacheKey = 'all_users';
    const cachedUsers = await this.redisService.get(cacheKey);
    if (cachedUsers) {
      let users: User[] | null = await JSON.parse(cachedUsers);
      users = users || [];
      const newUsers = users.filter(user => user.id !== existingUser.id);
      await this.redisService.set(cacheKey, JSON.stringify(newUsers));
    }

    await this.redisService.del(`user:${id}`);
  }
}
