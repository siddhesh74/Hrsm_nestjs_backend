import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkIn(userId: string, checkInDto: CheckInDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('Already checked in for today');
    }

    const checkInTime = checkInDto.checkIn ? new Date(checkInDto.checkIn) : new Date();

    return this.prisma.attendance.create({
      data: {
        userId,
        date: today,
        checkIn: checkInTime,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async checkOut(userId: string, checkOutDto: CheckOutDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!attendance) {
      throw new BadRequestException('No check-in record found for today');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out for today');
    }

    const checkOutTime = checkOutDto.checkOut ? new Date(checkOutDto.checkOut) : new Date();
    
    if (checkOutTime <= attendance.checkIn) {
      throw new BadRequestException('Check-out time must be after check-in time');
    }

    // Calculate work hours
    const workHours = (checkOutTime.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
    
    // Determine status based on work hours
    let status: AttendanceStatus;
    if (workHours >= 4) {
      status = AttendanceStatus.PRESENT;
    } else if (workHours >= 2) {
      status = AttendanceStatus.HALF_DAY;
    } else {
      status = AttendanceStatus.ABSENT;
    }

    return this.prisma.attendance.update({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      data: {
        checkOut: checkOutTime,
        workHours: Math.round(workHours * 100) / 100, // Round to 2 decimal places
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getTodayAttendance(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getAttendanceHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    month?: string,
    year?: number,
  ) {
    const skip = (page - 1) * limit;
    
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, parseInt(month) - 1, 1);
      const endDate = new Date(year, parseInt(month), 0);
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const [attendances, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          userId,
          ...dateFilter,
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.attendance.count({
        where: {
          userId,
          ...dateFilter,
        },
      }),
    ]);

    return {
      attendances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAttendanceSummary(userId: string, month: string, year: number) {
    const startDate = new Date(year, parseInt(month) - 1, 1);
    const endDate = new Date(year, parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        salary: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate statistics
    const presentDays = attendanceRecords.filter(record => record.status === AttendanceStatus.PRESENT).length;
    const halfDays = attendanceRecords.filter(record => record.status === AttendanceStatus.HALF_DAY).length;
    const absentDays = attendanceRecords.filter(record => record.status === AttendanceStatus.ABSENT).length;
    
    const totalWorkHours = attendanceRecords.reduce((sum, record) => sum + record.workHours, 0);
    const workingDays = new Date(year, parseInt(month), 0).getDate(); // Days in month
    const attendancePercentage = workingDays > 0 
      ? ((presentDays + 0.5 * halfDays) / workingDays * 100) 
      : 0;

    // Calculate salary information
    const baseSalary = user.salary;
    const perDaySalary = baseSalary / workingDays;
    const salaryDeduction = (absentDays * perDaySalary) + (halfDays * 0.5 * perDaySalary);
    const finalSalary = baseSalary - salaryDeduction;

    return {
      user,
      month,
      year,
      workingDays,
      presentDays,
      halfDays,
      absentDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      salary: {
        baseSalary,
        perDaySalary: Math.round(perDaySalary * 100) / 100,
        salaryDeduction: Math.round(salaryDeduction * 100) / 100,
        finalSalary: Math.round(finalSalary * 100) / 100,
      },
      attendanceRecords,
    };
  }

  async getAllAttendance(
    page: number = 1,
    limit: number = 10,
    date?: string,
    department?: string,
    status?: AttendanceStatus,
  ) {
    const skip = (page - 1) * limit;
    
    let whereClause: any = {};
    
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      whereClause.date = targetDate;
    }
    
    if (department) {
      whereClause.user = {
        department: { contains: department, mode: 'insensitive' },
      };
    }
    
    if (status) {
      whereClause.status = status;
    }

    const [attendances, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
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
      this.prisma.attendance.count({ where: whereClause }),
    ]);

    return {
      attendances,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
