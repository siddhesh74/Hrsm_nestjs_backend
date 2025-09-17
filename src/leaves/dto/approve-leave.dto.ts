import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaveStatus } from '@prisma/client';

export class ApproveLeaveDto {
  @ApiProperty({
    example: 'APPROVED',
    description: 'Leave approval status',
    enum: LeaveStatus,
  })
  @IsEnum(LeaveStatus)
  status: LeaveStatus;

  @ApiProperty({
    example: 'Leave approved for personal work',
    description: 'Rejection reason (required if status is REJECTED)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
