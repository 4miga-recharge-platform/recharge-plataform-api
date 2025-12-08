import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateRequiredFields } from 'src/utils/validation.util';
import { setTimeout as sleep } from 'timers/promises';
import { EmailService } from '../email/email.service';
import { getAdminDemotionTemplate } from '../email/templates/admin-demotion.template';
import { getAdminPromotionTemplate } from '../email/templates/admin-promotion.template';
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
        select: this.userSelect,
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
      emailConfirmationExpires.setHours(
        emailConfirmationExpires.getHours() + 24,
      );

      const data = {
        ...rest,
        password: await bcrypt.hash(dto.password, 10),
        role: 'USER' as const, // Explicitly set role as USER for all new users
        emailConfirmationCode: code,
        emailVerified: false,
        emailConfirmationExpires,
      };

      const user = await this.prisma.user.create({
        data,
        select: this.userSelect,
      });
      if (!user) {
        throw new BadRequestException('Failed to create user');
      }

      // Get store domain for email template
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
        select: { domain: true },
      });

      if (!store) {
        throw new BadRequestException('Store not found');
      }

      // Send confirmation email with retry (non-blocking for user creation)
      const html = getEmailConfirmationTemplate(
        code,
        dto.name,
        store.domain,
        dto.email,
        dto.storeId,
      );
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
      const fieldsToValidate = Object.keys(rest).filter(
        (key) => rest[key] !== undefined,
      );
      validateRequiredFields(rest, fieldsToValidate);

      const { role, ...data } = rest as any;
      if (role !== undefined) {
        console.warn(`Attempt to change role via general update blocked`);
      }

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

  async validatePassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return false;
      }

      return await bcrypt.compare(password, user.password);
    } catch {
      return false;
    }
  }

  async findEmailsByStore(
    storeId: string,
    search?: string,
  ): Promise<{ id: string; email: string }[]> {
    try {
      const where: any = {
        storeId,
        role: 'USER', // Only non-admin users
      };

      if (search) {
        where.email = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const users = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
        },
        orderBy: {
          email: 'asc',
        },
      });

      return users;
    } catch {
      throw new BadRequestException('Failed to fetch emails');
    }
  }

  async findAdminsByStore(
    storeId: string,
  ): Promise<{ id: string; email: string }[]> {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          storeId,
          role: 'RESELLER_ADMIN_4MIGA_USER',
        },
        select: {
          id: true,
          email: true,
        },
        orderBy: {
          email: 'asc',
        },
      });

      return admins;
    } catch {
      throw new BadRequestException('Failed to fetch admins');
    }
  }

  async promoteToAdmin(
    userId: string,
    adminStoreId: string,
    currentUserId: string,
  ): Promise<User> {
    try {
      // Find user with password select to get full data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Validate user belongs to same store
      if (user.storeId !== adminStoreId) {
        throw new BadRequestException(
          'Cannot promote users from different stores',
        );
      }

      // Check if user is already an admin
      if (user.role !== 'USER') {
        throw new BadRequestException('User is already an admin');
      }

      // Check if this email is already RESELLER_ADMIN in another store
      // MASTER_ADMIN_4MIGA_USER is excluded as it can access all stores
      const existingAdminInOtherStore = await this.prisma.user.findFirst({
        where: {
          email: user.email,
          role: 'RESELLER_ADMIN_4MIGA_USER',
          storeId: { not: adminStoreId },
        },
      });

      if (existingAdminInOtherStore) {
        throw new BadRequestException(
          'This email is already an administrator in another store',
        );
      }

      // Promote user with audit fields
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: 'RESELLER_ADMIN_4MIGA_USER',
          roleChangedBy: currentUserId,
          roleChangedAt: new Date(),
        },
        select: this.userSelect,
      });

      // Get store information for email
      const store = await this.prisma.store.findUnique({
        where: { id: adminStoreId },
        select: { name: true, domain: true },
      });

      if (store) {
        // Send promotion notification email (non-blocking)
        const html = getAdminPromotionTemplate(
          updatedUser.name,
          store.name,
          new Date(),
          store.domain,
        );

        this.sendEmailWithRetry(
          updatedUser.email,
          'Você foi promovido a Administrador',
          html,
          3,
          2000,
        ).catch((err) => console.error('Failed to send promotion email:', err));
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to promote user');
    }
  }

  async demoteToUser(
    userId: string,
    adminStoreId: string,
    currentUserId: string,
  ): Promise<User> {
    try {
      // Prevent self-demotion
      if (userId === currentUserId) {
        throw new BadRequestException('Cannot demote yourself');
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Validate user belongs to same store
      if (user.storeId !== adminStoreId) {
        throw new BadRequestException(
          'Cannot demote users from different stores',
        );
      }

      // Check if user is a reseller admin
      if (user.role !== 'RESELLER_ADMIN_4MIGA_USER') {
        throw new BadRequestException('User is not a reseller admin');
      }

      // Demote user with audit fields
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: 'USER',
          roleChangedBy: currentUserId,
          roleChangedAt: new Date(),
        },
        select: this.userSelect,
      });

      // Get store information for email
      const store = await this.prisma.store.findUnique({
        where: { id: adminStoreId },
        select: { name: true, domain: true },
      });

      if (store) {
        // Send demotion notification email (non-blocking)
        const html = getAdminDemotionTemplate(
          updatedUser.name,
          store.name,
          new Date(),
          store.domain,
        );

        this.sendEmailWithRetry(
          updatedUser.email,
          'Alteração de Permissões de Administrador',
          html,
          3,
          2000,
        ).catch((err) => console.error('Failed to send demotion email:', err));
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to demote user');
    }
  }
}
