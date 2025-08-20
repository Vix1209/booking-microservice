import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Current password for account verification',
    example: 'currentPassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Confirmation text (must be "DELETE")',
    example: 'DELETE',
  })
  @IsString()
  @IsNotEmpty()
  confirmation: string;
}
