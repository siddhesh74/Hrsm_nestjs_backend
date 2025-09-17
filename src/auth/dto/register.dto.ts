import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'EMPLOYEE',
    description: 'User role',
    enum: Role,
    default: Role.employee,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.employee;

  @ApiProperty({
    example: 'Engineering',
    description: 'Department name',
  })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Date of joining',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfJoining: string;

  @ApiProperty({
    example: 50000,
    description: 'Monthly salary',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  salary: number;
}
