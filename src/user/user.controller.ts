import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';
import { LoggedUser } from '../auth/logged-user.decorator';
import { ValidationInterceptor } from '../common/interceptors/validation.interceptor';
import { ConfirmRoleChangeDto } from './dto/confirm-role-change.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserCleanupService } from './user-cleanup.service';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
@UseInterceptors(ValidationInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userCleanupService: UserCleanupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users from a specific store' })
  findAll(@Query('storeId') storeId: string) {
    return this.userService.findAll(storeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('cleanup-unverified')
  @ApiOperation({ summary: 'Manually trigger cleanup of unverified users' })
  async cleanupUnverifiedUsers() {
    await this.userCleanupService.manualCleanup();
    return { message: 'Cleanup process completed' };
  }

  @Get('emails')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get all user emails from the logged admin store (non-admins only)',
  })
  findEmails(@LoggedUser() user: User, @Query('search') search?: string) {
    return this.userService.findEmailsByStore(user.storeId, search);
  }

  @Get('admins')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admin emails from the logged admin store' })
  findAdmins(@LoggedUser() user: User) {
    return this.userService.findAdminsByStore(user.storeId);
  }

  @Patch(':id/promote')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Promote a user to admin (requires password confirmation)',
  })
  async promoteToAdmin(
    @Param('id') id: string,
    @LoggedUser() user: User,
    @Body() confirmDto: ConfirmRoleChangeDto,
  ) {
    // Validate admin password before promoting
    const isPasswordValid = await this.userService.validatePassword(
      user.id,
      confirmDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return this.userService.promoteToAdmin(id, user.storeId, user.id);
  }

  @Patch(':id/demote')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('RESELLER_ADMIN_4MIGA_USER')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Demote an admin to regular user (requires password confirmation)',
  })
  async demoteToUser(
    @Param('id') id: string,
    @LoggedUser() user: User,
    @Body() confirmDto: ConfirmRoleChangeDto,
  ) {
    // Validate admin password before demoting
    const isPasswordValid = await this.userService.validatePassword(
      user.id,
      confirmDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return this.userService.demoteToUser(id, user.storeId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by id' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by id' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
