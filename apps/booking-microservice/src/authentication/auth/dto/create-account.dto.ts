import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { Unique } from 'typeorm';
import { Role } from 'types/role.types';

export class CreateUserDto {
  @IsString()
  @ApiProperty({
    description: 'The User email',
    example: '',
  })
  @IsEmail()
  @IsNotEmpty()
  @Unique(['email'])
  email: string;

  @ApiProperty({
    description: 'The User password',
    example: '',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'The User role',
    example: 'admin',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
