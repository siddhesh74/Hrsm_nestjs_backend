import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
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
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'employee',
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
    example: '2024-01-01T00:00:00.000Z',
    description: 'Date of joining',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfJoining: Date;

  @ApiProperty({
    example: 50000,
    description: 'Monthly salary',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiProperty({
    example: 5,
    description: 'Leave balance',
    default: 5,
  })
  @IsNumber()
  @IsOptional()
  leaveBalance?: number = 5;

  @ApiProperty({
    example: true,
    description: 'User active status',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
