import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export type DigioBankValidationMode = 'PENNY_LESS' | 'PENNY_DROP' | 'AUTO';
export type DigioIdCardType =
  | 'PAN'
  | 'PASSPORT'
  | 'VOTER_ID'
  | 'DRIVING_LICENSE'
  | 'CIN'
  | 'DIN'
  | 'UAADHAAR'
  | 'UDYAMAADHAAR'
  | 'FSSAI'
  | 'GST'
  | 'GST_ADVANCED'
  | 'PAN_TO_GST';

export class VerifyPanDto {
  @IsNotEmpty({ message: 'PAN number is required' })
  @IsString()
  panNumber!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  targetDriverId?: string;

  @IsOptional()
  @IsString()
  targetVendorId?: string;
}

export class VerifyDrivingLicenseDto {
  @IsNotEmpty({ message: 'Driving License number is required' })
  @IsString()
  dlNumber!: string;

  @IsNotEmpty({ message: 'Date of birth is required for Driving License verification' })
  @IsString()
  dob!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class VerifyVehicleRcDto {
  @IsNotEmpty({ message: 'Vehicle registration number is required' })
  @IsString()
  registrationNumber!: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class VerifyPassportDto {
  @IsNotEmpty()
  @IsString()
  fileNumber!: string;

  @IsNotEmpty()
  @IsString()
  dob!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class VerifyVoterIdDto {
  @IsNotEmpty()
  @IsString()
  voterId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class VerifyKraPanDto {
  @IsNotEmpty()
  @IsString()
  panNumber!: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsIn(['I', 'E', 'B'])
  fetchType?: 'I' | 'E' | 'B';

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class VerifyIfscDto {
  @IsNotEmpty({ message: 'IFSC code is required' })
  @IsString()
  ifsc!: string;
}

export class VerifyBankAccountDto {
  @IsNotEmpty({ message: 'Account number is required' })
  @IsString()
  accountNumber!: string;

  @IsNotEmpty({ message: 'IFSC code is required' })
  @IsString()
  ifsc!: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsIn(['PENNY_LESS', 'PENNY_DROP', 'AUTO'])
  validationMode?: DigioBankValidationMode;

  @IsOptional()
  @IsBoolean()
  saveToDriverProfile?: boolean;

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class VerifyUpiVpaDto {
  @IsNotEmpty({ message: 'UPI VPA is required' })
  @IsString()
  vpa!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  saveToDriverProfile?: boolean;
}

export class SearchUpiVpaDto {
  @IsNotEmpty()
  @IsString()
  handlePrefix!: string;
}

export class VerifyGstDto {
  @IsNotEmpty({ message: 'GSTIN is required' })
  @IsString()
  gstin!: string;

  @IsOptional()
  @IsBoolean()
  advanced?: boolean;

  @IsOptional()
  @IsBoolean()
  saveToVendorProfile?: boolean;

  @IsOptional()
  @IsString()
  targetVendorId?: string;
}

export class VerifyPanToGstDto {
  @IsNotEmpty()
  @IsString()
  panNumber!: string;

  @IsOptional()
  @IsIn(['LIST_ONLY', 'BASIC'])
  listingType?: 'LIST_ONLY' | 'BASIC';
}

export class VerifyCinDto {
  @IsNotEmpty()
  @IsString()
  cin!: string;

  @IsOptional()
  @IsString()
  targetVendorId?: string;
}

export class VerifyDinDto {
  @IsNotEmpty()
  @IsString()
  din!: string;
}

export class VerifyUdyamDto {
  @IsNotEmpty()
  @IsString()
  udyamNumber!: string;

  @IsOptional()
  @IsString()
  targetVendorId?: string;
}

export class VerifyFssaiDto {
  @IsNotEmpty()
  @IsString()
  fssaiNumber!: string;
}

export class FuzzyMatchDto {
  @IsNotEmpty()
  @IsString()
  sourceText!: string;

  @IsNotEmpty()
  @IsString()
  targetText!: string;

  @IsNotEmpty()
  @IsIn(['name', 'address'])
  context!: 'name' | 'address';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class VerifyUanDto {
  @IsNotEmpty()
  @IsIn(['UAN', 'MOBILE'])
  type!: 'UAN' | 'MOBILE';

  @IsNotEmpty()
  @IsString()
  identifier!: string;

  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean;
}

export class AnalyzeStoredIdCardDto {
  @IsNotEmpty()
  @IsString()
  frontDocUrl!: string;

  @IsOptional()
  @IsString()
  backDocUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expectedIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  saveMaskedToDriver?: boolean;

  @IsOptional()
  @IsIn(['FRONT', 'BACK'])
  aadhaarSide?: 'FRONT' | 'BACK';

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class MaskStoredAadhaarDto {
  @IsNotEmpty()
  @IsString()
  documentUrl!: string;

  @IsOptional()
  @IsIn(['FRONT', 'BACK'])
  side?: 'FRONT' | 'BACK';

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class FaceMatchStoredDto {
  @IsOptional()
  @IsString()
  image1Url?: string;

  @IsOptional()
  @IsString()
  image2Url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(99)
  minimumMatch?: number;

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class LivenessStoredDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  targetDriverId?: string;
}

export class CreateDigilockerRequestDto {
  @IsOptional()
  @IsString()
  customerIdentifier?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;

  @IsOptional()
  @IsObject()
  presetValues?: Record<string, unknown>;
}

export class ManageDigilockerApprovalDto {
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminRunDriverDigioSuiteDto {
  @IsOptional()
  @IsBoolean()
  includePan?: boolean;

  @IsOptional()
  @IsBoolean()
  includeDl?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRc?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFaceMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAadhaarMask?: boolean;

  @IsOptional()
  @IsBoolean()
  includeBank?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFuzzyMatch?: boolean;

  @IsOptional()
  @IsString()
  dobOverride?: string;

  @IsOptional()
  @IsString()
  panOverride?: string;

  @IsOptional()
  @IsString()
  dlOverride?: string;

  @IsOptional()
  @IsString()
  rcOverride?: string;
}

export interface DigioVerificationRecordDto {
  id: string;
  verificationType: string;
  category: string;
  status: string;
  verified: boolean;
  identifier?: string | null;
  uniqueRequestId: string;
  digioRequestId?: string | null;
  verifiedName?: string | null;
  matchScore?: number | null;
  complianceOk?: boolean | null;
  complianceNotes?: string | null;
  errorMessage?: string | null;
  summary?: Record<string, unknown> | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

