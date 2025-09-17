import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get admin dashboard data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Admin dashboard data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('employee')
  @ApiOperation({ summary: 'Get employee dashboard data' })
  @ApiResponse({ status: 200, description: 'Employee dashboard data retrieved successfully' })
  getEmployeeDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getEmployeeDashboard(user.id);
  }

  @Get('departments')
  @UseGuards(RolesGuard)
  @Roles(Role.admin)
  @ApiOperation({ summary: 'Get department statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Department statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  getDepartmentStats() {
    return this.dashboardService.getDepartmentStats();
  }
}
