import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckOutDto {
  @ApiProperty({
    example: '2024-01-15T18:00:00.000Z',
    description: 'Check-out time (optional, defaults to current time)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  checkOut?: string;
}
