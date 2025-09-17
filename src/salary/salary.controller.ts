import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalaryService } from './salary.service';
import { CalculateSalaryDto } from './dto/calculate-salary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';

@ApiTags('Salary')
@Controller('salary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) { }

  @Post('calculate/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Calculate salary for a specific user (Admin only)' })
  @ApiResponse({ status: 201, description: 'Salary calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid month format or salary already exists' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  calculateSalary(
    @Param('userId') userId: string,
    @Body() calculateSalaryDto: CalculateSalaryDto,
  ) {
    return this.salaryService.calculateSalary(userId, calculateSalaryDto);
  }

  @Post('calculate-bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Calculate salary for all users (Admin only)' })
  @ApiResponse({ status: 201, description: 'Bulk salary calculation completed' })
  @ApiResponse({ status: 400, description: 'Invalid month format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  calculateBulkSalary(@Body() calculateSalaryDto: CalculateSalaryDto) {
    return this.salaryService.calculateBulkSalary(calculateSalaryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get salary records (Admin sees all, Employee sees own)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'month', required: false, type: String, description: 'Filter by month (YYYY-MM)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
  @ApiQuery({ name: 'department', required: false, type: String, description: 'Filter by department (Admin only)' })
  @ApiResponse({ status: 200, description: 'Salary records retrieved successfully' })
  getSalaryRecords(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('month') month?: string,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('department') department?: string,
  ) {
    // If employee, only show their own salary records
    const userId = user.role === Role.employee ? user.id : undefined;
    // If employee, ignore department filter
    const deptFilter = user.role === Role.admin ? department : undefined;

    return this.salaryService.getSalaryRecords(page, limit, month, year, deptFilter, userId);
  }

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get salary summary with department breakdown (Admin only)' })
  @ApiQuery({ name: 'month', required: false, type: String, description: 'Filter by month (YYYY-MM)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
  @ApiResponse({ status: 200, description: 'Salary summary retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  getSalarySummary(
    @Query('month') month?: string,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.salaryService.getSalarySummary(month, year);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get current user salary history' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'User salary history retrieved successfully' })
  getUserSalaryHistory(
    @CurrentUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.salaryService.getUserSalaryHistory(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get salary record by ID' })
  @ApiResponse({ status: 200, description: 'Salary record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Salary record not found' })
  @ApiResponse({ status: 400, description: 'Access denied to this salary record' })
  getSalaryById(@CurrentUser() user: User, @Param('id') id: string) {
    // Employees can only view their own salary records
    const userId = user.role === Role.employee ? user.id : undefined;
    return this.salaryService.getSalaryById(id, userId);
  }
}
