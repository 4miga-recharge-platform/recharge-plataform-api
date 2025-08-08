import { BadRequestException, Injectable } from '@nestjs/common';
import { setTimeout as sleep } from 'timers/promises';
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
    } catch {
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
    } catch {
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

      // Check if user already exists with same email in the same store
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          storeId: dto.storeId,
        },
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      // Check if user already exists with same document in the same store
      const existingUserByDocument = await this.prisma.user.findFirst({
        where: {
          documentValue: dto.documentValue,
          storeId: dto.storeId,
        },
      });

      if (existingUserByDocument) {
        throw new BadRequestException('User with this document already exists');
      }

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
      if(!user) {
        throw new BadRequestException('Failed to create user');
      }

      // Send confirmation email with retry (non-blocking for user creation)
      const html = getEmailConfirmationTemplate(code, dto.name);
      await this.sendEmailWithRetry(
        dto.email,
        'Confirm your registration',
        html,
        3,
        2000,
      );
      return user;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  private async sendEmailWithRetry(
    to: string,
    subject: string,
    html: string,
    maxAttempts: number = 3,
    delayMs: number = 2000,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.emailService.sendEmail(to, subject, html);
        return true;
      } catch {
        const isLastAttempt = attempt === maxAttempts;
        if (isLastAttempt) {
          return false;
        }
        await sleep(delayMs);
      }
    }
    return false;
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
    } catch {
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
    } catch {
      throw new BadRequestException('Failed to remove user');
    }
  }
}
