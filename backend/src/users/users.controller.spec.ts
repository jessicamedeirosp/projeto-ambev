import { UsersController } from './users.controller';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('Users Controller', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    controller = new UsersController(usersServiceMock as any);
  });

  it('should find one user', async () => {
    const userId = '1';
    const mockUser = {
      id: userId,
      name: 'Jessica',
      email: 'teste@teste.com',
    };

    (usersServiceMock.findOne as jest.Mock).mockResolvedValue(mockUser);

    const result = await controller.findOne(userId);

    expect(usersServiceMock.findOne).toHaveBeenCalledWith(userId);
    expect(result).toEqual(mockUser);
  });

  it('should find all users', async () => {
    const mockUsers = [
      { id: '1', name: 'Jessica', email: 'teste@teste.com' },
      { id: '2', name: 'João', email: 'joao@teste.com' },
    ];

    (usersServiceMock.findAll as jest.Mock).mockResolvedValue(mockUsers);

    const result = await controller.findAll();

    expect(usersServiceMock.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockUsers);
  });

  it('should create a new user', async () => {
    const createUserDto: CreateUserDto = {
      name: 'Jessica',
      email: 'teste@teste.com',
      password: '123123',
    };

    const mockUser = {
      id: '1',
      name: 'Jessica',
      email: 'teste@teste.com',
    };

    (usersServiceMock.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await controller.create(createUserDto);

    expect(usersServiceMock.create).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual(mockUser);
  });

  it('should update a user', async () => {
    const userId = '1';
    const updateUserDto: UpdateUserDto = {
      name: 'Jessica Novo',
      email: 'teste@teste.com',
      password: '123123',
    };

    const updatedUser = {
      id: userId,
      name: 'Jessica Novo',
      email: 'teste@teste.com',
    };

    (usersServiceMock.update as jest.Mock).mockResolvedValue(updatedUser);

    const result = await controller.update(userId, updateUserDto);

    expect(usersServiceMock.update).toHaveBeenCalledWith(userId, updateUserDto);
    expect(result).toEqual(updatedUser);
  });

  it('should delete a user', async () => {
    const userId = '1';

    await controller.remove(userId);

    expect(usersServiceMock.remove).toHaveBeenCalledWith(userId);
  });
});
