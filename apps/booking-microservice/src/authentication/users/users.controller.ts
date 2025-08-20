import {
  Controller,
  Put,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from 'decorators/getUser.decorator';
import { User } from './entities/user.entity';
import {
  DeleteAccountDocs,
  UpdatePasswordDocs,
  UpdateProfileDocs,
} from './docs/users.docs';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtGuard)
@ApiBearerAuth('JWT')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('profile')
  @UpdateProfileDocs()
  async updateProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Patch('password')
  @UpdatePasswordDocs()
  async updatePassword(
    @GetUser() user: User,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(user.id, updatePasswordDto);
  }

  @Delete('account')
  @DeleteAccountDocs()
  async deleteAccount(
    @GetUser() user: User,
    @Body() deleteAccountDto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(user.id, deleteAccountDto);
  }
}
