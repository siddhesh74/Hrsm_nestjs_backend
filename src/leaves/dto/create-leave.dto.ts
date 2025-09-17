import { IsDateString, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveDto {
  @ApiProperty({
    example: '2024-01-15',
    description: 'Leave start date',
  })
  @IsDateString()
  @IsNotEmpty()
  fromDate: string;

  @ApiProperty({
    example: '2024-01-17',
    description: 'Leave end date',
  })
  @IsDateString()
  @IsNotEmpty()
  toDate: string;

  @ApiProperty({
    example: 'Personal work',
    description: 'Reason for leave',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}
