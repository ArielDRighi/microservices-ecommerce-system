import { IsString } from 'class-validator';

export class SendWelcomeEmailDto {
  @IsString()
  userId: string;
}
