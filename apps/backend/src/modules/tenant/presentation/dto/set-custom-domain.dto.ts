import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SetCustomDomainDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, {
    message: 'Custom domain must be a valid domain (e.g., learn.company.com)',
  })
  customDomain: string;
}

