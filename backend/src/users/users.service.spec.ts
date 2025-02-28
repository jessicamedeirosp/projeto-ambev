import { HashingService } from "../hashing/hashing.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";
import { RedisService } from 'src/redis/redis.service';
import { Test, TestingModule } from "@nestjs/testing";
import { CreateUserDto } from "./dto/create-user.dto";
import { BadRequestException } from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";


describe('UsersService', () => {
  let userService: UsersService;
  let prismaService: PrismaService;
  let hashingService: HashingService;
  let redisService: RedisService;
  const exampleUsers = [
    {
      id: 'user-1',
      name: 'Jessica',
      email: 'jessica_teste@teste.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user-2',
      name: 'Carlos',
      email: 'carlos_teste@teste.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn().mockResolvedValue({
                id: 'some-id',
                name: 'Jessica',
                email: 'jessica_teste@teste.com',
              }),
              findUnique: jest.fn(),
              findMany: jest.fn().mockResolvedValue(exampleUsers),
              update: jest.fn(),
              delete: jest.fn()
            }
          }
        },
        {
          provide: HashingService,
          useValue: {
            hash: jest.fn()
          }
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn()
          }
        }
      ]
    }).compile();

    userService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    hashingService = module.get<HashingService>(HashingService);
    redisService = module.get<RedisService>(RedisService);
  });

  describe('Create User', () => {
    it('should create a new user in the database', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password: 'teste123'
      };

      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXEMPLO');

      const result = await userService.create(createUserDto);

      expect(hashingService.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          password_hash: 'HASH_MOCK_EXEMPLO',
        },
        select: {
          id: true,
          name: true,
          email: true,
          password_hash: false,
          created_at: true,
          updated_at: true,
        },
      });

      expect(result).toEqual({
        id: 'some-id',
        name: createUserDto.name,
        email: createUserDto.email,
      });
    });

    it('should store the created user in Redis', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password: 'teste123'
      };

      jest.spyOn(hashingService, 'hash').mockResolvedValue('HASH_MOCK_EXEMPLO');
      jest.spyOn(redisService, 'set').mockResolvedValue();

      const result = await userService.create(createUserDto);


      expect(redisService.set).toHaveBeenCalledWith(
        `user:${'some-id'}`,
        JSON.stringify({
          id: 'some-id',
          name: createUserDto.name,
          email: createUserDto.email,
        })
      );

      expect(result).toEqual({
        id: 'some-id',
        name: createUserDto.name,
        email: createUserDto.email,
      });
    });

    it('should add a new user to cache when cache exists', async () => {
      const user = {
        id: 'some-id',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password: 'example-password'
      };
      const cachedUsers = [{ id: 'user-2', name: 'Teste', email: 'teste2@teste.com' }];
      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(cachedUsers));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await userService.create(user);

      expect(redisService.set).toHaveBeenCalledWith(`user:${user.id}`, JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
      }));

      expect(redisService.set).toHaveBeenCalledWith('all_users', JSON.stringify([...cachedUsers, {
        id: user.id,
        name: user.name,
        email: user.email,
      }]));
    });

    it('should create a new cache when no cache exists', async () => {
      const user = {
        id: 'some-id',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password: 'example-password'
      };

      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(null));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      await userService.create(user);

      expect(redisService.set).toHaveBeenCalledWith(`user:${user.id}`, JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
      }));

      expect(redisService.set).toHaveBeenCalledWith('all_users', JSON.stringify([{
        id: user.id,
        name: user.name,
        email: user.email,
      }]));
    });
  });

  describe('findAll users', () => {
    it('should return users from cache', async () => {

      jest.spyOn(redisService, 'get').mockResolvedValueOnce(JSON.stringify(exampleUsers));

      const result = await userService.findAll();

      expect(redisService.get).toHaveBeenCalledWith('all_users');

      expect(result).toEqual(exampleUsers);
    });

    it('should fetch users from database and store them in cache when not in cache', async () => {

      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);

      const result = await userService.findAll();


      expect(redisService.get).toHaveBeenCalledWith('all_users');

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          password_hash: false,
          created_at: true,
          updated_at: true
        }
      });

      expect(redisService.set).toHaveBeenCalledWith('all_users', JSON.stringify(exampleUsers));

      expect(result).toEqual(exampleUsers);
    });
  });


  describe('findOne user', () => {
    it('should return a user from cache', async () => {
      const userId = 'user-1';
      const cachedUser = exampleUsers.find(user => user.id === userId);


      jest.spyOn(redisService, 'get').mockResolvedValueOnce(JSON.stringify(cachedUser));

      const result = await userService.findOne(userId);

      expect(redisService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(result).toEqual(cachedUser);
    });

    it('should fetch user from database and store it in cache when not in cache', async () => {
      const userId = 'some-id';
      const userFromDb = {
        id: 'some-id',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password_hash: 'teste123',
        created_at: new Date(),
        updated_at: new Date()
      }


      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);


      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(userFromDb);

      const result = await userService.findOne(userId);

      expect(redisService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          password_hash: false,
          created_at: true,
          updated_at: true
        }
      });
      expect(redisService.set).toHaveBeenCalledWith(
        `user:${userId}`,
        JSON.stringify(userFromDb)
      );
      expect(result).toEqual(userFromDb);
    });

    it('should return null if user is not found in database', async () => {
      const userId = 'non-existent-user';


      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);


      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      const result = await userService.findOne(userId);

      expect(redisService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          password_hash: false,
          created_at: true,
          updated_at: true
        }
      });
      expect(result).toBeNull();
    });
  });


  describe('update user', () => {
    it('should update the user successfully', async () => {
      const userId = 'user-1';
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
        email: 'updated_email@teste.com',
        password: 'newpassword123',
      };

      const hashedPassword = 'hashed-password-example';
      jest.spyOn(hashingService, 'hash').mockResolvedValue(hashedPassword);

      const updatedUser = {
        id: userId,
        name: 'Updated Name',
        email: 'updated_email@teste.com',
        password_hash: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      };


      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: exampleUsers[0].id,
        name: exampleUsers[0].name,
        email: exampleUsers[0].email,
        created_at: new Date(exampleUsers[0].created_at),
        updated_at: new Date(exampleUsers[0].updated_at),
        password_hash: 'teste123'
      });
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(updatedUser);

      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await userService.update(userId, updateUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: updateUserDto.name,
          email: updateUserDto.email,
          password_hash: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          password_hash: false,
          created_at: true,
          updated_at: true,
        },
      });

      expect(redisService.set).toHaveBeenCalledWith(
        `user:${userId}`,
        JSON.stringify(updatedUser)
      );

      expect(result).toEqual(updatedUser);
    });

    it('should throw BadRequestException if user not found', async () => {
      const userId = 'non-existing-user';
      const updatedUser = {
        id: userId,
        name: 'Updated Name',
        email: 'taken_email@teste.com',
        password: 'password-example',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updateUserDto: UpdateUserDto = updatedUser

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(userService.update(userId, updateUserDto))
        .rejects
        .toThrowError(BadRequestException);
    });

    it('should throw BadRequestException if email is already taken by another user', async () => {
      const userId = 'user-1';
      const updatedUser = {
        id: userId,
        name: 'Updated Name',
        email: 'taken_email@teste.com',
        password: 'password-example',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updateUserDto: UpdateUserDto = updatedUser


      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: exampleUsers[0].id,
        name: exampleUsers[0].name,
        email: exampleUsers[0].email,
        created_at: new Date(exampleUsers[0].created_at),
        updated_at: new Date(exampleUsers[0].updated_at),
        password_hash: 'teste123'
      });


      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: 'user-2',
        email: 'taken_email@teste.com',
        name: 'Carlos',
        password_hash: 'hash',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(userService.update(userId, updateUserDto))
        .rejects
        .toThrowError(BadRequestException);
    });

    it('should update the cache when it exists', async () => {
      const updatedUser = {
        id: 'some-id',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password_hash: 'hashed-password',
      };

      const createdAt = new Date();
      const cachedUsers = [
        { id: 'user-1', name: 'Teste', email: 'teste@teste.com' },
        { id: 'some-id', name: 'Old Name', email: 'jessica_teste@teste.com' }
      ];


      jest.spyOn(redisService, 'get').mockResolvedValue(JSON.stringify(cachedUsers));
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: 'some-id',
        name: 'Old Name',
        email: 'jessica_teste@teste.com',
        password_hash: 'old-password-hash',
        created_at: createdAt,
        updated_at: createdAt,
      });


      jest.spyOn(prismaService.user, 'update').mockResolvedValueOnce({
        ...updatedUser,
        created_at: createdAt,
        updated_at: createdAt,
      });


      await userService.update(updatedUser.id, {
        name: updatedUser.name,
        email: updatedUser.email,
        password: 'new-password'
      });


      expect(redisService.set).toHaveBeenCalledWith(`user:${updatedUser.id}`, JSON.stringify({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        password_hash: updatedUser.password_hash,
        created_at: createdAt,
        updated_at: createdAt,
      }));


      expect(redisService.set).toHaveBeenCalledWith('all_users', JSON.stringify([
        { id: 'user-1', name: 'Teste', email: 'teste@teste.com' },
        {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          password_hash: updatedUser.password_hash,
          created_at: createdAt,
          updated_at: createdAt,
        }
      ]));
    });



    it('should create a new cache if it does not exist', async () => {
      const createdAt = new Date();
      const updatedUser = {
        id: 'some-id',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password_hash: 'hashed-password'
      };


      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: 'some-id',
        name: 'Old Name',
        email: 'jessica_teste@teste.com',
        password_hash: 'old-password-hash',
        created_at: createdAt,
        updated_at: createdAt,
      });


      jest.spyOn(prismaService.user, 'update').mockResolvedValueOnce({
        ...updatedUser,
        created_at: createdAt,
        updated_at: createdAt,
      });


      await userService.update(updatedUser.id, {
        name: updatedUser.name,
        email: updatedUser.email,
        password: 'new-password'
      });


      expect(redisService.set).toHaveBeenCalledWith(`user:${updatedUser.id}`, JSON.stringify({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        password_hash: updatedUser.password_hash,
        created_at: createdAt,
        updated_at: createdAt,
      }));


      expect(redisService.set).toHaveBeenCalledWith('all_users', JSON.stringify([{
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        password_hash: updatedUser.password_hash,
        created_at: createdAt,
        updated_at: createdAt,
      }]));
    });
  });

  describe('remove user', () => {
    it('should remove the user from the database and cache', async () => {
      const userId = 'user-1';

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        id: userId,
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        created_at: new Date(),
        updated_at: new Date(),
        password_hash: 'teste123',
      });

      jest.spyOn(prismaService.user, 'delete').mockResolvedValueOnce({
        id: userId,
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        created_at: new Date(),
        updated_at: new Date(),
        password_hash: 'teste123',
      });

      jest.spyOn(redisService, 'del').mockResolvedValueOnce();

      await userService.remove(userId);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(redisService.del).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should throw BadRequestException if user is not found', async () => {
      const userId = 'non-existent-user';

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(userService.remove(userId))
        .rejects
        .toThrowError(BadRequestException);

      expect(prismaService.user.delete).not.toHaveBeenCalled();


      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should remove a user and update cache when user exists', async () => {
      const userId = 'user-1';
      const existingUser = {
        id: 'user-1',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password_hash: 'hashed-password',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const cachedUsers = [
        { id: 'user-1', name: 'Jessica', email: 'jessica_teste@teste.com' },
        { id: 'user-2', name: 'Carlos', email: 'carlos_teste@teste.com' },
      ];

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(existingUser);
      jest.spyOn(prismaService.user, 'delete').mockResolvedValueOnce(existingUser);
      jest.spyOn(redisService, 'get').mockResolvedValueOnce(JSON.stringify(cachedUsers));
      jest.spyOn(redisService, 'set').mockResolvedValue();
      jest.spyOn(redisService, 'del').mockResolvedValue();

      await userService.remove(userId);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });

      const updatedUsers = cachedUsers.filter(user => user.id !== userId);
      expect(redisService.set).toHaveBeenCalledWith('all_users', JSON.stringify(updatedUsers));
      expect(redisService.del).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('should throw BadRequestException if user is not found', async () => {
      const userId = 'non-existing-user';

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      await expect(userService.remove(userId)).rejects.toThrowError(BadRequestException);
    });

    it('should not update cache if no users are in cache', async () => {
      const userId = 'user-1';
      const existingUser = {
        id: 'user-1',
        name: 'Jessica',
        email: 'jessica_teste@teste.com',
        password_hash: 'hashed-password',
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(existingUser);
      jest.spyOn(prismaService.user, 'delete').mockResolvedValueOnce(existingUser);
      jest.spyOn(redisService, 'get').mockResolvedValueOnce(null);
      jest.spyOn(redisService, 'del').mockResolvedValue();

      await userService.remove(userId);

      expect(redisService.set).not.toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith(`user:${userId}`);
    });

  });


});

