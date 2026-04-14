import {
  Controller, Get, Patch, Delete, Post, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailLogService } from './mail-log.service';

@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailLogController {
  constructor(private readonly mailLogService: MailLogService) {}

  @Get()
  findAll(
    @Query('folder') folder: string,
    @Query('type') type: string,
    @Query('search') search: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.mailLogService.findAll({ folder, type, search, page: +page || 1, limit: +limit || 30 });
  }

  @Get('stats')
  getStats() {
    return this.mailLogService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mailLogService.findOne(id);
  }

  @Patch(':id/star')
  star(@Param('id') id: string) {
    return this.mailLogService.star(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mailLogService.markDeleted(id);
  }

  @Patch(':id/spam')
  markSpam(@Param('id') id: string) {
    return this.mailLogService.markSpam(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.mailLogService.restore(id);
  }

  @Post('compose')
  compose(@Body() body: { to: string[]; subject: string; bodyHtml: string }) {
    return this.mailLogService.compose(body.to, body.subject, body.bodyHtml);
  }

  @Post('webhook')
  handleWebhook(@Body() body: any) {
    return this.mailLogService.handleWebhook(body);
  }
}
