import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * Admin PATCH body for the global platform policy (all amounts in rupees).
 * A real class (not an inline type) so the global ValidationPipe actually validates it:
 * a string, NaN or negative value would otherwise reach Prisma's Decimal columns.
 */
export class UpdatePolicyConfigDto {
  @ApiPropertyOptional({ description: 'Security escort add-on per trip, in rupees', example: 300 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  escortFee?: number;

  @ApiPropertyOptional({ description: 'Driver monthly subscription fee, in rupees', example: 499 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  driverMonthlyFee?: number;

  @ApiPropertyOptional({ description: 'Driver free-trial length in days', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  driverTrialDays?: number;

  @ApiPropertyOptional({ description: 'Minimum driver withdrawal, in rupees', example: 1000 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  minWithdrawalAmount?: number;
}
