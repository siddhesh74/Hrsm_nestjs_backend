import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty({
    example: '2024-01-15T09:00:00.000Z',
    description: 'Check-in time (optional, defaults to current time)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  checkIn?: string;
}
