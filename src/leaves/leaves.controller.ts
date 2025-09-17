import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User, LeaveStatus } from '@prisma/client';

@ApiTags('Leaves')
@Controller('leaves')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) { }

  @Post()
  @ApiOperation({ summary: 'Apply for leave' })
  @ApiResponse({ status: 201, description: 'Leave application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid leave dates or overlapping leave' })
  create(@CurrentUser() user: User, @Body() createLeaveDto: CreateLeaveDto) {
    return this.leavesService.create(user.id, createLeaveDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get leaves (Admin sees all, Employee sees own)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'department', required: false, type: String, description: 'Filter by department (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leaves retrieved successfully' })
  findAll(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: LeaveStatus,
    @Query('department') department?: string,
  ) {
    // If employee, only show their own leaves
    const userId = user.role === Role.employee ? user.id : undefined;
    // If employee, ignore department filter
    const deptFilter = user.role === Role.admin ? department : undefined;

    return this.leavesService.findAll(page, limit, status, deptFilter, userId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get current user leave balance and statistics' })
  @ApiResponse({ status: 200, description: 'Leave balance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getLeaveBalance(@CurrentUser() user: User) {
    return this.leavesService.getLeaveBalance(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get leave by ID' })
  @ApiResponse({ status: 200, description: 'Leave retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Leave not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this leave request' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    // Employees can only view their own leaves
    const userId = user.role === Role.employee ? user.id : undefined;
    return this.leavesService.findOne(id, userId);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Approve or reject leave (Admin only)' })
  @ApiResponse({ status: 200, description: 'Leave status updated successfully' })
  @ApiResponse({ status: 404, description: 'Leave not found' })
  @ApiResponse({ status: 400, description: 'Leave already processed or invalid data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  approve(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() approveLeaveDto: ApproveLeaveDto,
  ) {
    return this.leavesService.approve(id, user.id, approveLeaveDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel leave request' })
  @ApiResponse({ status: 200, description: 'Leave cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Leave not found' })
  @ApiResponse({ status: 400, description: 'Only pending leaves can be cancelled' })
  @ApiResponse({ status: 403, description: 'Access denied to this leave request' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    // Employees can only cancel their own leaves
    const userId = user.role === Role.employee ? user.id : undefined;
    return this.leavesService.remove(id, userId);
  }
}
