import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { EmailService } from '../email/email.service';
import { getEmailConfirmationTemplate } from '../email/templates/email-confirmation.template';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    phone: true,
    documentType: true,
    documentValue: true,
    emailVerified: true,
    password: false,
    createdAt: false,
    updatedAt: false,
    storeId: true,
  };

  async findAll(storeId: string): Promise<User[]> {
    try {
      const data = await this.prisma.user.findMany({
        where: { storeId },
        select: this.userSelect
      });
      return data;
    } catch (error) {
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const data = await this.prisma.user.findUnique({
        where: { id },
        select: this.userSelect,
      });
      if (!data) {
        throw new BadRequestException('User not found');
      }
      return data;
    } catch (error) {
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      const { ...rest } = dto;
      validateRequiredFields(rest, [
        'name',
        'email',
        'phone',
        'password',
        'documentType',
        'documentValue',
        'storeId',
      ]);

      // Generate email confirmation code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Set expiration time to 24 hours from now
      const emailConfirmationExpires = new Date();
      emailConfirmationExpires.setHours(emailConfirmationExpires.getHours() + 24);

      const data = {
        ...rest,
        password: await bcrypt.hash(dto.password, 10),
        emailConfirmationCode: code,
        emailVerified: false,
        emailConfirmationExpires,
      };

      const user = await this.prisma.user.create({
        data,
        select: this.userSelect,
      });

      // Send confirmation email
      const html = getEmailConfirmationTemplate(code, dto.name);
      await this.emailService.sendEmail(
        dto.email,
        'Confirme seu cadastro',
        html,
      );

      return user;
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      await this.findOne(id);
      const { ...rest } = dto;
      const fieldsToValidate = Object.keys(rest).filter(key => rest[key] !== undefined);
      validateRequiredFields(rest, fieldsToValidate);
      const data = { ...rest };
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          ...(dto.password && {
            password: await bcrypt.hash(dto.password, 10),
          }),
        },
        select: this.userSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update user');
    }
  }

  async remove(id: string): Promise<User> {
    try {
      await this.findOne(id);
      return await this.prisma.user.delete({
        where: { id },
        select: this.userSelect,
      });
    } catch (error) {
      throw new BadRequestException('Failed to remove user');
    }
  }
}
