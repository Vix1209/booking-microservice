/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Auth } from '../auth/entities/auth.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { verify, hash } from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
  ) {}

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if it's already in use
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }
    }

    // Update user fields
    Object.assign(user, updateProfileDto);
    user.updatedAt = new Date();

    const updatedUser = await this.userRepository.save(user);

    // Return user without sensitive data
    const { auth, ...userWithoutAuth } = updatedUser;
    return userWithoutAuth as User;
  }

  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = updatePasswordDto;

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Get user with auth data
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { auth: true },
    });

    if (!user || !user.auth) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await verify(
      user.auth.hashedPassword,
      currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await hash(newPassword);

    // Update password
    user.auth.hashedPassword = hashedNewPassword;
    user.updatedAt = new Date();

    await this.authRepository.save(user.auth);
    await this.userRepository.save(user);

    return { message: 'Password updated successfully' };
  }

  async deleteAccount(
    userId: string,
    deleteAccountDto: DeleteAccountDto,
  ): Promise<{ message: string }> {
    const { password, confirmation } = deleteAccountDto;

    // Validate confirmation text
    if (confirmation !== 'DELETE') {
      throw new BadRequestException(
        'Confirmation text must be "DELETE" to proceed',
      );
    }

    // Get user with auth data
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { auth: true },
    });

    if (!user || !user.auth) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await verify(user.auth.hashedPassword, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Soft delete user (mark as deleted)
    user.status = 'deleted';
    user.updatedAt = new Date();
    await this.userRepository.save(user);

    // Remove auth record
    await this.authRepository.remove(user.auth);

    return { message: 'Account deleted successfully' };
  }
}
