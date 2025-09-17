import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, AttendanceStatus } from '@prisma/client';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post('check-in')
  @ApiOperation({ summary: 'Check in for today' })
  @ApiResponse({ status: 201, description: 'Successfully checked in' })
  @ApiResponse({ status: 400, description: 'Already checked in for today' })
  checkIn(@CurrentUser() user: User, @Body() checkInDto: CheckInDto) {
    return this.attendanceService.checkIn(user.id, checkInDto);
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Check out for today' })
  @ApiResponse({ status: 200, description: 'Successfully checked out' })
  @ApiResponse({ status: 400, description: 'No check-in record found or already checked out' })
  checkOut(@CurrentUser() user: User, @Body() checkOutDto: CheckOutDto) {
    return this.attendanceService.checkOut(user.id, checkOutDto);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s attendance record' })
  @ApiResponse({ status: 200, description: 'Today\'s attendance record' })
  getTodayAttendance(@CurrentUser() user: User) {
    return this.attendanceService.getTodayAttendance(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get attendance history for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'month', required: false, type: String, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Year' })
  @ApiResponse({ status: 200, description: 'Attendance history retrieved' })
  getAttendanceHistory(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('month') month?: string,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.attendanceService.getAttendanceHistory(user.id, page, limit, month, year);
  }

  @Get('summary/:month/:year')
  @ApiOperation({ summary: 'Get attendance summary for a specific month' })
  @ApiResponse({ status: 200, description: 'Attendance summary retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getAttendanceSummary(
    @CurrentUser() user: User,
    @Param('month') month: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getAttendanceSummary(user.id, month, year);
  }

  @Get('employee/:empId/summary/:month/:year')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get attendance summary for any employee (Admin only)' })
  @ApiResponse({ status: 200, description: 'Employee attendance summary retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  getEmployeeAttendanceSummary(
    @Param('empId') empId: string,
    @Param('month') month: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getAttendanceSummary(empId, month, year);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get all attendance records with filters (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'department', required: false, type: String, description: 'Filter by department' })
  @ApiQuery({ name: 'status', required: false, enum: AttendanceStatus, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'All attendance records retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  getAllAttendance(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('date') date?: string,
    @Query('department') department?: string,
    @Query('status') status?: AttendanceStatus,
  ) {
    return this.attendanceService.getAllAttendance(page, limit, date, department, status);
  }
}
