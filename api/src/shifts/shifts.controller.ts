import {
  Controller, Post, Get, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  getCurrent(@Query('branchId') branchId: string) {
    return this.shiftsService.getCurrentShift(branchId);
  }

  @Get()
  getAll(@Query('branchId') branchId: string, @Query('page') page = '1', @Query('limit') limit = '10') {
    return this.shiftsService.getShifts(branchId, +page, +limit);
  }

  @Post('open')
  openShift(
    @Request() req: any,
    @Body() body: { branchId: string; openingCash: number },
  ) {
    return this.shiftsService.openShift(req.user.id, body.branchId, body.openingCash || 0);
  }

  @Post('close')
  closeShift(
    @Request() req: any,
    @Body() body: { closingCash: number; note?: string },
    @Query('branchId') branchId: string,
  ) {
    // branchId comes from token or query
    const bid = branchId || req.user.branchId;
    return this.shiftsService.closeShift(req.user.id, bid, body.closingCash || 0, body.note);
  }
}
