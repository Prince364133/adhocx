import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  AdminRunDriverDigioSuiteDto,
  AnalyzeStoredIdCardDto,
  AuthUserDto,
  CreateDigilockerRequestDto,
  FaceMatchStoredDto,
  FuzzyMatchDto,
  LivenessStoredDto,
  ManageDigilockerApprovalDto,
  MaskStoredAadhaarDto,
  SearchUpiVpaDto,
  UserRole,
  VerifyBankAccountDto,
  VerifyCinDto,
  VerifyDinDto,
  VerifyDrivingLicenseDto,
  VerifyFssaiDto,
  VerifyGstDto,
  VerifyIfscDto,
  VerifyKraPanDto,
  VerifyPanDto,
  VerifyPanToGstDto,
  VerifyPassportDto,
  VerifyUanDto,
  VerifyUdyamDto,
  VerifyUpiVpaDto,
  VerifyVehicleRcDto,
  VerifyVoterIdDto,
} from '@adhocx/contracts';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common';
import { DigioService } from './digio.service';

@ApiTags('Digio KYC / KYB')
@Controller('kyc/digio')
export class DigioController {
  constructor(private readonly digioService: DigioService) {}

  // ---------------------------------------------------------------------------
  // Status & History
  // ---------------------------------------------------------------------------

  @Get('capabilities')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check Digio integration status & supported checks' })
  getCapabilities() {
    return this.digioService.getCapabilities();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Digio KYC/KYB verification history for current user' })
  getMyVerifications(@CurrentUser() user: AuthUserDto) {
    return this.digioService.getMyVerifications(user);
  }

  // ---------------------------------------------------------------------------
  // Govt ID & Vehicle Verifications
  // ---------------------------------------------------------------------------

  @Post('pan')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify PAN card via Digio' })
  verifyPan(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyPanDto) {
    return this.digioService.verifyPan(user, dto);
  }

  @Post('pan/kra')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check KRA PAN KYC status via Digio' })
  verifyKraPan(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyKraPanDto) {
    return this.digioService.verifyKraPan(user, dto);
  }

  @Post('dl')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify Driving License & COV transport validity via Digio' })
  verifyDl(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: VerifyDrivingLicenseDto,
  ) {
    return this.digioService.verifyDrivingLicense(user, dto);
  }

  @Post('vehicle-rc')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify Vehicle RC (Vahan: fitness, insurance, permit, PUCC, blacklist)' })
  verifyVehicleRc(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: VerifyVehicleRcDto,
  ) {
    return this.digioService.verifyVehicleRc(user, dto);
  }

  @Post('passport')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify Indian Passport via Digio' })
  verifyPassport(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: VerifyPassportDto,
  ) {
    return this.digioService.verifyPassport(user, dto);
  }

  @Post('voter-id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify Voter ID (EPIC) via Digio' })
  verifyVoterId(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyVoterIdDto) {
    return this.digioService.verifyVoterId(user, dto);
  }

  // ---------------------------------------------------------------------------
  // Document AI OCR + Verification + Aadhaar Masking
  // ---------------------------------------------------------------------------

  @Post('id-card/analyze-stored')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'OCR, verify & optionally mask Aadhaar from stored document URLs' })
  analyzeStoredIdCard(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: AnalyzeStoredIdCardDto,
  ) {
    return this.digioService.analyzeStoredIdCard(user, dto);
  }

  @Post('id-card/analyze')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('files', 2, { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload 1 or 2 ID images for Digio OCR, verification & Aadhaar masking' })
  analyzeUploadedIdCard(
    @CurrentUser() user: AuthUserDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || !files.length) {
      throw new BadRequestException('At least one ID document image/PDF file is required');
    }
    return this.digioService.analyzeIdCardFiles(user, {
      front: {
        buffer: files[0].buffer,
        mimeType: files[0].mimetype,
        filename: files[0].originalname,
      },
      back: files[1]
        ? {
            buffer: files[1].buffer,
            mimeType: files[1].mimetype,
            filename: files[1].originalname,
          }
        : undefined,
    });
  }

  @Post('aadhaar/mask-stored')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mask Aadhaar first 8 digits from stored Aadhaar URL & update driver record' })
  maskStoredAadhaar(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: MaskStoredAadhaarDto,
  ) {
    return this.digioService.maskStoredAadhaar(user, dto);
  }

  @Post('aadhaar/mask')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Mask Aadhaar digits on an uploaded Aadhaar file' })
  maskUploadedAadhaar(
    @CurrentUser() user: AuthUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aadhaar image/PDF file is required');
    }
    return this.digioService.maskAadhaarFileBuffer(user, {
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
    });
  }

  // ---------------------------------------------------------------------------
  // Biometric Face Match & Liveness
  // ---------------------------------------------------------------------------

  @Post('biometric/face-match-stored')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Compare stored profile selfie vs stored ID photo via Digio FaceMatch' })
  faceMatchStored(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: FaceMatchStoredDto,
  ) {
    return this.digioService.faceMatchStored(user, dto);
  }

  @Post('biometric/face-match')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('files', 2, { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Compare two uploaded face images via Digio FaceMatch' })
  faceMatchUpload(
    @CurrentUser() user: AuthUserDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length < 2) {
      throw new BadRequestException('Two face images (selfie + ID photo) are required');
    }
    return this.digioService.faceMatchBuffers(user, {
      file1: {
        buffer: files[0].buffer,
        mimeType: files[0].mimetype,
        filename: files[0].originalname,
      },
      file2: {
        buffer: files[1].buffer,
        mimeType: files[1].mimetype,
        filename: files[1].originalname,
      },
    });
  }

  @Post('biometric/liveness-stored')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Run passive selfie liveness check on stored profile photo' })
  livenessStored(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: LivenessStoredDto,
  ) {
    return this.digioService.checkStoredLiveness(user, dto);
  }

  @Post('biometric/liveness')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Run passive selfie liveness check on an uploaded photo' })
  livenessUpload(
    @CurrentUser() user: AuthUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Selfie image file is required');
    }
    return this.digioService.checkLivenessBuffer(user, {
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
    });
  }

  // ---------------------------------------------------------------------------
  // Banking & UPI
  // ---------------------------------------------------------------------------

  @Post('bank/ifsc')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lookup bank/branch & payment rails for an IFSC code via Digio' })
  verifyIfsc(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyIfscDto) {
    return this.digioService.verifyIfsc(user, dto);
  }

  @Post('bank/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify bank account via Digio Penny-Less / Penny-Drop' })
  verifyBankAccount(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: VerifyBankAccountDto,
  ) {
    return this.digioService.verifyBankAccount(user, dto);
  }

  @Post('upi/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify UPI VPA handle & registered holder name via Digio' })
  verifyUpiVpa(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyUpiVpaDto) {
    return this.digioService.verifyUpiVpa(user, dto);
  }

  @Post('upi/search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search valid UPI handle suffixes via Digio' })
  searchUpiVpa(@CurrentUser() user: AuthUserDto, @Body() dto: SearchUpiVpaDto) {
    return this.digioService.searchUpiVpa(user, dto);
  }

  // ---------------------------------------------------------------------------
  // Business KYB (GST, PAN-to-GST, CIN, DIN, Udyam, FSSAI)
  // ---------------------------------------------------------------------------

  @Post('business/gst')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify GSTIN (standard or advanced) for corporate/vendor KYB' })
  verifyGst(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyGstDto) {
    return this.digioService.verifyGst(user, dto);
  }

  @Post('business/pan-to-gst')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Discover all GSTINs registered against a company PAN' })
  verifyPanToGst(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: VerifyPanToGstDto,
  ) {
    return this.digioService.verifyPanToGst(user, dto);
  }

  @Post('business/cin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify MCA Corporate Identification Number (CIN)' })
  verifyCin(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyCinDto) {
    return this.digioService.verifyCin(user, dto);
  }

  @Post('business/din')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify MCA Director Identification Number (DIN)' })
  verifyDin(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyDinDto) {
    return this.digioService.verifyDin(user, dto);
  }

  @Post('business/udyam')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify MSME Udyam registration certificate number' })
  verifyUdyam(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyUdyamDto) {
    return this.digioService.verifyUdyam(user, dto);
  }

  @Post('business/fssai')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify FSSAI business license' })
  verifyFssai(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyFssaiDto) {
    return this.digioService.verifyFssai(user, dto);
  }

  // ---------------------------------------------------------------------------
  // Fuzzy Match & UAN Employment
  // ---------------------------------------------------------------------------

  @Post('fuzzy-match')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Compare two names or addresses using Digio Fuzzy Match AI' })
  fuzzyMatch(@CurrentUser() user: AuthUserDto, @Body() dto: FuzzyMatchDto) {
    return this.digioService.fuzzyMatch(user, dto);
  }

  @Post('uan')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify EPFO UAN employment check (Admin only)' })
  verifyUan(@CurrentUser() user: AuthUserDto, @Body() dto: VerifyUanDto) {
    return this.digioService.verifyUan(user, dto);
  }

  // ---------------------------------------------------------------------------
  // DigiLocker / Guided KYC Gateway Sessions
  // ---------------------------------------------------------------------------

  @Post('digilocker/request')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.CORPORATE_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Initiate a Digio DigiLocker KYC request + Gateway SDK token/URL' })
  createDigilockerSession(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CreateDigilockerRequestDto,
  ) {
    return this.digioService.createDigilockerSession(user, dto);
  }

  @Get('digilocker/request/:requestId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Poll & sync DigiLocker KYC status from Digio API' })
  syncDigilockerStatus(
    @CurrentUser() user: AuthUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.digioService.syncDigilockerResponse(user, requestId);
  }

  @Post('digilocker/request/:requestId/approval')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a Digio KYC request manually (Admin)' })
  manageDigilockerApproval(
    @CurrentUser() user: AuthUserDto,
    @Param('requestId') requestId: string,
    @Body() dto: ManageDigilockerApprovalDto,
  ) {
    return this.digioService.manageDigilockerApproval(user, requestId, dto);
  }

  @Post('digilocker/request/:requestId/reattempt')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Allow user/admin to reattempt an incomplete Digio KYC flow' })
  reattemptDigilocker(
    @CurrentUser() user: AuthUserDto,
    @Param('requestId') requestId: string,
  ) {
    return this.digioService.reattemptDigilockerRequest(user, requestId);
  }

  // ---------------------------------------------------------------------------
  // Admin Queries & 1-Click Verification Suite
  // ---------------------------------------------------------------------------

  @Get('admin/driver/:driverId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Digio verification records for a driver (Admin)' })
  getDriverVerifications(@Param('driverId') driverId: string) {
    return this.digioService.getDriverVerificationsForAdmin(driverId);
  }

  @Post('admin/driver/:driverId/run-suite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run full Digio automated verification suite for a driver (Admin)' })
  runDriverSuite(
    @CurrentUser() user: AuthUserDto,
    @Param('driverId') driverId: string,
    @Body() dto: AdminRunDriverDigioSuiteDto,
  ) {
    return this.digioService.runAdminDriverSuite(user, driverId, dto);
  }

  @Get('admin/vendor/:vendorId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all Digio KYB verification records for a vendor/corporate (Admin)' })
  getVendorVerifications(@Param('vendorId') vendorId: string) {
    return this.digioService.getVendorVerificationsForAdmin(vendorId);
  }

  // ---------------------------------------------------------------------------
  // Digio Webhook Receiver (HMAC-SHA256 X-Digio-Checksum)
  // ---------------------------------------------------------------------------

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Digio asynchronous KYC/KYB webhook events' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-digio-checksum') checksum: string | undefined,
    @Body() payload: any,
  ) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const remoteIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]
        : req.ip;

    return this.digioService.handleWebhook({
      rawBody: req.rawBody,
      checksumHeader: checksum,
      remoteIp,
      payload,
    });
  }
}
