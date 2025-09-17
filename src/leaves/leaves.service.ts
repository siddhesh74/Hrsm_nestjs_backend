import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { LeaveStatus } from '@prisma/client';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createLeaveDto: CreateLeaveDto) {
    const fromDate = new Date(createLeaveDto.fromDate);
    const toDate = new Date(createLeaveDto.toDate);

    if (toDate < fromDate) {
      throw new BadRequestException('To date must be after from date');
    }

    // Calculate total days
    const timeDiff = toDate.getTime() - fromDate.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Check for overlapping leaves
    const overlappingLeave = await this.prisma.leave.findFirst({
      where: {
        userId,
        status: { not: LeaveStatus.REJECTED },
        OR: [
          {
            fromDate: { lte: toDate },
            toDate: { gte: fromDate },
          },
        ],
      },
    });

    if (overlappingLeave) {
      throw new BadRequestException('Leave dates overlap with existing leave request');
    }

    // Get user's current leave balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { leaveBalance: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate paid and unpaid days
    const availableBalance = user.leaveBalance;
    const paidDays = Math.min(totalDays, availableBalance);
    const unpaidDays = totalDays - paidDays;

    return this.prisma.leave.create({
      data: {
        userId,
        fromDate,
        toDate,
        totalDays,
        reason: createLeaveDto.reason,
        paidDays,
        unpaidDays,
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
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: LeaveStatus,
    department?: string,
    userId?: string,
  ) {
    const skip = (page - 1) * limit;
    
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (department) {
      whereClause.user = {
        department: { contains: department, mode: 'insensitive' },
      };
    }

    const [leaves, total] = await Promise.all([
      this.prisma.leave.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.leave.count({ where: whereClause }),
    ]);

    return {
      leaves,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const leave = await this.prisma.leave.findUnique({
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
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    // If userId is provided, check if user owns this leave
    if (userId && leave.userId !== userId) {
      throw new ForbiddenException('Access denied to this leave request');
    }

    return leave;
  }

  async approve(id: string, approverId: string, approveLeaveDto: ApproveLeaveDto) {
    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request has already been processed');
    }

    if (approveLeaveDto.status === LeaveStatus.REJECTED && !approveLeaveDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting leave');
    }

    // Start transaction to update leave and user balance
    return this.prisma.$transaction(async (prisma) => {
      // Update leave status
      const updatedLeave = await prisma.leave.update({
        where: { id },
        data: {
          status: approveLeaveDto.status,
          approvedBy: approverId,
          approvedAt: new Date(),
          rejectionReason: approveLeaveDto.rejectionReason,
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
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If approved, deduct leave balance
      if (approveLeaveDto.status === LeaveStatus.APPROVED && leave.paidDays > 0) {
        await prisma.user.update({
          where: { id: leave.userId },
          data: {
            leaveBalance: {
              decrement: leave.paidDays,
            },
          },
        });
      }

      return updatedLeave;
    });
  }

  async getUserLeaves(userId: string, page: number = 1, limit: number = 10) {
    return this.findAll(page, limit, undefined, undefined, userId);
  }

  async getLeaveBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        leaveBalance: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get leave statistics
    const [totalLeaves, approvedLeaves, pendingLeaves, rejectedLeaves] = await Promise.all([
      this.prisma.leave.count({ where: { userId } }),
      this.prisma.leave.count({ where: { userId, status: LeaveStatus.APPROVED } }),
      this.prisma.leave.count({ where: { userId, status: LeaveStatus.PENDING } }),
      this.prisma.leave.count({ where: { userId, status: LeaveStatus.REJECTED } }),
    ]);

    // Get total approved leave days this year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const approvedLeavesThisYear = await this.prisma.leave.findMany({
      where: {
        userId,
        status: LeaveStatus.APPROVED,
        fromDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      select: {
        totalDays: true,
      },
    });

    const totalApprovedDaysThisYear = approvedLeavesThisYear.reduce(
      (sum, leave) => sum + leave.totalDays,
      0,
    );

    return {
      user,
      currentBalance: user.leaveBalance,
      statistics: {
        totalLeaves,
        approvedLeaves,
        pendingLeaves,
        rejectedLeaves,
        totalApprovedDaysThisYear,
      },
    };
  }

  async remove(id: string, userId?: string) {
    const leave = await this.findOne(id, userId);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave requests can be cancelled');
    }

    return this.prisma.leave.delete({
      where: { id },
    });
  }
}
