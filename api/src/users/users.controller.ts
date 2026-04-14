import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN, Role.MANAGER)
  findAll(@Query() query: any) { return this.usersService.findAll(query); }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN, Role.MANAGER)
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  create(@Body() dto: any) { return this.usersService.create(dto); }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  updatePut(@Param('id') id: string, @Body() dto: any) { return this.usersService.update(id, dto); }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: any) { return this.usersService.update(id, dto); }

  @Patch(':id/reset-password')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_ADMIN)
  resetPassword(@Param('id') id: string, @Body() dto: { newPassword: string }) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  remove(@Param('id') id: string) { return this.usersService.remove(id); }
}
