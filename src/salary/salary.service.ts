import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { CalculateSalaryDto } from './dto/calculate-salary.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class SalaryService {
  constructor(
    private prisma: PrismaService,
    private attendanceService: AttendanceService,
  ) {}

  async calculateSalary(userId: string, calculateSalaryDto: CalculateSalaryDto) {
    const { month, year } = calculateSalaryDto;
    
    // Validate month format
    const monthNum = parseInt(month.split('-')[1]);
    if (monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Invalid month format. Use YYYY-MM');
    }

    // Check if salary already exists for this month
    const existingSalary = await this.prisma.salary.findUnique({
      where: {
        userId_month: {
          userId,
          month,
        },
      },
    });

    if (existingSalary) {
      return existingSalary;
    }

    // Get attendance summary for the month
    const attendanceSummary = await this.attendanceService.getAttendanceSummary(
      userId,
      monthNum.toString(),
      year,
    );

    const user = attendanceSummary.user;
    const workingDays = attendanceSummary.workingDays;
    const presentDays = attendanceSummary.presentDays;
    const halfDays = attendanceSummary.halfDays;
    const absentDays = attendanceSummary.absentDays;
    const attendancePercentage = attendanceSummary.attendancePercentage;

    // Calculate salary
    const baseSalary = user.salary;
    const perDaySalary = baseSalary / workingDays;
    const salaryDeduction = (absentDays * perDaySalary) + (halfDays * 0.5 * perDaySalary);
    const finalSalary = baseSalary - salaryDeduction;

    // Create salary record
    const salary = await this.prisma.salary.create({
      data: {
        userId,
        month,
        year,
        baseSalary,
        workingDays,
        presentDays,
        halfDays,
        absentDays,
        attendancePercentage,
        salaryDeduction: Math.round(salaryDeduction * 100) / 100,
        finalSalary: Math.round(finalSalary * 100) / 100,
        isProcessed: true,
        processedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    return salary;
  }

  async calculateBulkSalary(calculateSalaryDto: CalculateSalaryDto) {
    const { month, year } = calculateSalaryDto;

    // Get all active users
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, department: true },
    });

    const results = [];
    const errors = [];

    for (const user of users) {
      try {
        const salary = await this.calculateSalary(user.id, calculateSalaryDto);
        results.push({
          userId: user.id,
          userName: user.name,
          status: 'success',
          salary,
        });
      } catch (error) {
        errors.push({
          userId: user.id,
          userName: user.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    return {
      month,
      year,
      totalUsers: users.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async getSalaryRecords(
    page: number = 1,
    limit: number = 10,
    month?: string,
    year?: number,
    department?: string,
    userId?: string,
  ) {
    const skip = (page - 1) * limit;
    
    let whereClause: any = {};
    
    if (month) {
      whereClause.month = month;
    }
    
    if (year) {
      whereClause.year = year;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (department) {
      whereClause.user = {
        department: { contains: department, mode: 'insensitive' },
      };
    }

    const [salaries, total] = await Promise.all([
      this.prisma.salary.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
      }),
      this.prisma.salary.count({ where: whereClause }),
    ]);

    return {
      salaries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSalaryById(id: string, userId?: string) {
    const salary = await this.prisma.salary.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    if (!salary) {
      throw new NotFoundException('Salary record not found');
    }

    // If userId is provided, check if user owns this salary record
    if (userId && salary.userId !== userId) {
      throw new BadRequestException('Access denied to this salary record');
    }

    return salary;
  }

  async getSalarySummary(month?: string, year?: number) {
    let whereClause: any = {};
    
    if (month) {
      whereClause.month = month;
    }
    
    if (year) {
      whereClause.year = year;
    }

    // Get salary statistics
    const [totalRecords, totalBaseSalary, totalFinalSalary, totalDeductions] = await Promise.all([
      this.prisma.salary.count({ where: whereClause }),
      this.prisma.salary.aggregate({
        where: whereClause,
        _sum: { baseSalary: true },
      }),
      this.prisma.salary.aggregate({
        where: whereClause,
        _sum: { finalSalary: true },
      }),
      this.prisma.salary.aggregate({
        where: whereClause,
        _sum: { salaryDeduction: true },
      }),
    ]);

    // Get department-wise breakdown
    const departmentBreakdown = await this.prisma.salary.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: {
        baseSalary: true,
        finalSalary: true,
        salaryDeduction: true,
      },
      _count: true,
    });

    // Get user details for department breakdown
    const userIds = departmentBreakdown.map(item => item.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, department: true },
    });

    const departmentStats = departmentBreakdown.reduce((acc, item) => {
      const user = users.find(u => u.id === item.userId);
      if (user) {
        const dept = user.department;
        if (!acc[dept]) {
          acc[dept] = {
            department: dept,
            employeeCount: 0,
            totalBaseSalary: 0,
            totalFinalSalary: 0,
            totalDeductions: 0,
          };
        }
        acc[dept].employeeCount += 1;
        acc[dept].totalBaseSalary += item._sum.baseSalary || 0;
        acc[dept].totalFinalSalary += item._sum.finalSalary || 0;
        acc[dept].totalDeductions += item._sum.salaryDeduction || 0;
      }
      return acc;
    }, {});

    return {
      month,
      year,
      summary: {
        totalRecords,
        totalBaseSalary: Math.round((totalBaseSalary._sum.baseSalary || 0) * 100) / 100,
        totalFinalSalary: Math.round((totalFinalSalary._sum.finalSalary || 0) * 100) / 100,
        totalDeductions: Math.round((totalDeductions._sum.salaryDeduction || 0) * 100) / 100,
        averageAttendance: totalRecords > 0 
          ? Math.round((await this.prisma.salary.aggregate({
              where: whereClause,
              _avg: { attendancePercentage: true },
            }))._avg.attendancePercentage * 100) / 100 
          : 0,
      },
      departmentBreakdown: Object.values(departmentStats),
    };
  }

  async getUserSalaryHistory(userId: string, page: number = 1, limit: number = 10) {
    return this.getSalaryRecords(page, limit, undefined, undefined, undefined, userId);
  }
}
