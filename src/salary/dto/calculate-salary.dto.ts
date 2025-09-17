import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateSalaryDto {
  @ApiProperty({
    example: '2024-01',
    description: 'Month in YYYY-MM format',
  })
  @IsString()
  @IsNotEmpty()
  month: string;

  @ApiProperty({
    example: 2024,
    description: 'Year',
    minimum: 2020,
    maximum: 2030,
  })
  @IsNumber()
  @Min(2020)
  @Max(2030)
  year: number;
}
