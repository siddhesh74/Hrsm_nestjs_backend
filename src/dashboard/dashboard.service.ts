import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, LeaveStatus, Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboard() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get basic counts
    const [
      totalEmployees,
      activeEmployees,
      totalDepartments,
      todayAttendance,
      pendingLeaves,
      thisMonthSalaries,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.findMany({
        select: { department: true },
        distinct: ['department'],
        where: { isActive: true },
      }),
      this.prisma.attendance.count({
        where: {
          date: today,
          status: { not: AttendanceStatus.ABSENT },
        },
      }),
      this.prisma.leave.count({
        where: { status: LeaveStatus.PENDING },
      }),
      this.prisma.salary.count({
        where: {
          month: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`,
        },
      }),
    ]);

    // Get attendance statistics for today
    const todayAttendanceStats = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { date: today },
      _count: true,
    });

    const attendanceBreakdown = {
      present: 0,
      halfDay: 0,
      absent: 0,
      notCheckedIn: activeEmployees,
    };

    todayAttendanceStats.forEach(stat => {
      switch (stat.status) {
        case AttendanceStatus.PRESENT:
          attendanceBreakdown.present = stat._count;
          break;
        case AttendanceStatus.HALF_DAY:
          attendanceBreakdown.halfDay = stat._count;
          break;
        case AttendanceStatus.ABSENT:
          attendanceBreakdown.absent = stat._count;
          break;
      }
    });

    attendanceBreakdown.notCheckedIn = activeEmployees - 
      (attendanceBreakdown.present + attendanceBreakdown.halfDay + attendanceBreakdown.absent);

    // Get department-wise employee count
    const departmentStats = await this.prisma.user.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: true,
    });

    // Get recent activities (last 10 activities)
    const [recentAttendance, recentLeaves] = await Promise.all([
      this.prisma.attendance.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, department: true },
          },
        },
      }),
      this.prisma.leave.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, department: true },
          },
        },
      }),
    ]);

    // Get monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const [attendanceCount, leaveCount, salaryCount] = await Promise.all([
        this.prisma.attendance.count({
          where: {
            date: {
              gte: new Date(date.getFullYear(), date.getMonth(), 1),
              lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
            },
          },
        }),
        this.prisma.leave.count({
          where: {
            createdAt: {
              gte: new Date(date.getFullYear(), date.getMonth(), 1),
              lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
            },
          },
        }),
        this.prisma.salary.count({
          where: { month },
        }),
      ]);

      monthlyTrends.push({
        month,
        attendance: attendanceCount,
        leaves: leaveCount,
        salariesProcessed: salaryCount,
      });
    }

    return {
      overview: {
        totalEmployees,
        activeEmployees,
        totalDepartments: totalDepartments.length,
        todayAttendance,
        pendingLeaves,
        thisMonthSalaries,
      },
      attendanceBreakdown,
      departmentStats: departmentStats.map(stat => ({
        department: stat.department,
        employeeCount: stat._count,
      })),
      recentActivities: {
        attendance: recentAttendance.map(att => ({
          id: att.id,
          user: att.user.name,
          department: att.user.department,
          action: att.checkOut ? 'Check Out' : 'Check In',
          time: att.checkOut || att.checkIn,
          status: att.status,
        })),
        leaves: recentLeaves.map(leave => ({
          id: leave.id,
          user: leave.user.name,
          department: leave.user.department,
          action: 'Leave Application',
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          status: leave.status,
          createdAt: leave.createdAt,
        })),
      },
      monthlyTrends,
    };
  }

  async getEmployeeDashboard(userId: string) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        leaveBalance: true,
      },
    });

    // Get today's attendance
    const todayAttendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    // Get this month's attendance summary
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyAttendance = await this.prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const presentDays = monthlyAttendance.filter(att => att.status === AttendanceStatus.PRESENT).length;
    const halfDays = monthlyAttendance.filter(att => att.status === AttendanceStatus.HALF_DAY).length;
    const absentDays = monthlyAttendance.filter(att => att.status === AttendanceStatus.ABSENT).length;
    const totalWorkHours = monthlyAttendance.reduce((sum, att) => sum + att.workHours, 0);
    const workingDays = endOfMonth.getDate();
    const attendancePercentage = workingDays > 0 
      ? ((presentDays + 0.5 * halfDays) / workingDays * 100) 
      : 0;

    // Get leave statistics
    const [totalLeaves, pendingLeaves, approvedLeaves, rejectedLeaves] = await Promise.all([
      this.prisma.leave.count({ where: { userId } }),
      this.prisma.leave.count({ where: { userId, status: LeaveStatus.PENDING } }),
      this.prisma.leave.count({ where: { userId, status: LeaveStatus.APPROVED } }),
      this.prisma.leave.count({ where: { userId, status: LeaveStatus.REJECTED } }),
    ]);

    // Get recent attendance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentAttendance = await this.prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
      orderBy: { date: 'desc' },
      take: 7,
    });

    // Get recent leaves
    const recentLeaves = await this.prisma.leave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        approver: {
          select: { name: true },
        },
      },
    });

    // Get last 6 months attendance trend
    const attendanceTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthAttendance = await this.prisma.attendance.findMany({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const monthPresent = monthAttendance.filter(att => att.status === AttendanceStatus.PRESENT).length;
      const monthHalf = monthAttendance.filter(att => att.status === AttendanceStatus.HALF_DAY).length;
      const monthWorkingDays = monthEnd.getDate();
      const monthPercentage = monthWorkingDays > 0 
        ? ((monthPresent + 0.5 * monthHalf) / monthWorkingDays * 100) 
        : 0;

      attendanceTrend.push({
        month: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        percentage: Math.round(monthPercentage * 100) / 100,
        presentDays: monthPresent,
        halfDays: monthHalf,
        totalDays: monthWorkingDays,
      });
    }

    return {
      user,
      todayAttendance: todayAttendance ? {
        checkIn: todayAttendance.checkIn,
        checkOut: todayAttendance.checkOut,
        workHours: todayAttendance.workHours,
        status: todayAttendance.status,
      } : null,
      monthlyStats: {
        presentDays,
        halfDays,
        absentDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        workingDays,
      },
      leaveStats: {
        balance: user.leaveBalance,
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
      },
      recentAttendance: recentAttendance.map(att => ({
        date: att.date,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        workHours: att.workHours,
        status: att.status,
      })),
      recentLeaves: recentLeaves.map(leave => ({
        id: leave.id,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        approver: leave.approver?.name,
        createdAt: leave.createdAt,
      })),
      attendanceTrend,
    };
  }

  async getDepartmentStats() {
    const departmentStats = await this.prisma.user.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: true,
    });

    const detailedStats = await Promise.all(
      departmentStats.map(async (dept) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayPresent, totalEmployees, avgSalary] = await Promise.all([
          this.prisma.attendance.count({
            where: {
              date: today,
              status: { not: AttendanceStatus.ABSENT },
              user: { department: dept.department },
            },
          }),
          this.prisma.user.count({
            where: {
              department: dept.department,
              isActive: true,
            },
          }),
          this.prisma.user.aggregate({
            where: {
              department: dept.department,
              isActive: true,
            },
            _avg: { salary: true },
          }),
        ]);

        return {
          department: dept.department,
          totalEmployees,
          todayPresent,
          attendanceRate: totalEmployees > 0 ? (todayPresent / totalEmployees * 100) : 0,
          averageSalary: Math.round((avgSalary._avg.salary || 0) * 100) / 100,
        };
      })
    );

    return detailedStats;
  }
}
