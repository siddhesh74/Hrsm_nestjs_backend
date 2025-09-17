import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CLIENT_RENEG_LIMIT } from 'tls';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create({
      ...registerDto,
      dateOfJoining: new Date(registerDto.dateOfJoining),
    });

    const { password, ...result } = user;
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: result,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    console.log('User found:', user ? 'Yes' : 'No');
    console.log('User email:', user?.email);
    console.log('User active:', user?.isActive);
    console.log('Input password:', loginDto.password);
    console.log('Stored password hash:', user?.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or user');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const { password, ...result } = user;
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: result,
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...result } = user;
    return result;
  }

  private generateToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
