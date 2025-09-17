import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';
import { SalaryModule } from '../salary/salary.module';

@Module({
  imports: [AttendanceModule, LeavesModule, SalaryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
