---
title: API Request and Response DTO Catalog
description: Source-derived request/response type fields and validation metadata used by API routes.
status: partial
last_reviewed: "2026-11-23"
---

# API Request and Response DTO Catalog

This catalog lists named TypeScript contract types referenced in controller request parameters and method return/Swagger annotations. Fields and validator decorators are read from source; this is not a sample-payload guarantee. Inline `any` and object parameters are documented in the endpoint pages, not normalized into shared DTOs.

The global `ValidationPipe` whitelists declared DTO fields, rejects non-whitelisted fields and does not enable implicit conversion (`apps/api/src/main.ts`). A class-validator decorator applies only where a concrete class DTO is used; TypeScript interfaces and inline types do not provide runtime class metadata.

## AdminAssignmentListItemDto {#admin-assignment-list-item-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/admin.dto.ts:160`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `requirementId` | `string` | No | None declared on property |
| `driverId` | `string` | No | None declared on property |
| `driverName` | `string` | No | None declared on property |
| `driverPhone` | `string` | No | None declared on property |
| `vehiclePlate` | `string` | No | None declared on property |
| `vehicleType` | `string` | No | None declared on property |
| `status` | `string` | No | None declared on property |
| `assignedAt` | `string` | No | None declared on property |

**Referenced by:** [listAssignments](./endpoints/assignments-controller.md).

## AdminAssignmentQueryDto {#admin-assignment-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/admin.dto.ts:150`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `string` | Yes | `IsOptional`, `IsString` |
| `search` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [listAssignments](./endpoints/assignments-controller.md).

## AdminDriverQueryDto {#admin-driver-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/admin.dto.ts:5`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `verificationStatus` | `VerificationStatus` | Yes | `IsOptional`, `IsEnum` |
| `availabilityStatus` | `DriverAvailability` | Yes | `IsOptional`, `IsEnum` |
| `search` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [listDrivers](./endpoints/admin-controller.md).

## AdminProcessSettlementDto {#admin-process-settlement-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/settlement.dto.ts:44`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `SettlementStatus` | No | `IsEnum` |
| `transactionRef` | `string` | Yes | `IsOptional`, `IsString` |
| `failureReason` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [processSettlement](./endpoints/settlements-controller.md).

## AdminRescheduleRequestDto {#admin-reschedule-request-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:60`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `employeeId` | `string` | Yes | None declared on property |
| `newShiftTime` | `string` | Yes | None declared on property |
| `newShiftDate` | `string` | Yes | None declared on property |
| `action` | `'CANCEL' \| 'RESCHEDULE'` | No | None declared on property |
| `actorUserId` | `string` | Yes | None declared on property |
| `reason` | `string` | No | None declared on property |

**Referenced by:** [adminRescheduleOrCancel](./endpoints/corporate-trip-execution-controller.md).

## AdminRunDriverDigioSuiteDto {#admin-run-driver-digio-suite-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:391`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `includePan` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `includeDl` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `includeRc` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `includeFaceMatch` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `includeAadhaarMask` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `includeBank` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `includeFuzzyMatch` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `dobOverride` | `string` | Yes | `IsOptional`, `IsString` |
| `panOverride` | `string` | Yes | `IsOptional`, `IsString` |
| `dlOverride` | `string` | Yes | `IsOptional`, `IsString` |
| `rcOverride` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [runDriverSuite](./endpoints/digio-controller.md).

## AdminVendorQueryDto {#admin-vendor-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/admin.dto.ts:19`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `verificationStatus` | `VerificationStatus` | Yes | `IsOptional`, `IsEnum` |
| `search` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [listVendors](./endpoints/admin-controller.md).

## AnalyzeStoredIdCardDto {#analyze-stored-id-card-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:278`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `frontDocUrl` | `string` | No | `IsNotEmpty`, `IsString` |
| `backDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `expectedIds` | `string[]` | Yes | `IsOptional`, `IsArray`, `IsString` |
| `features` | `string[]` | Yes | `IsOptional`, `IsArray`, `IsString` |
| `saveMaskedToDriver` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `aadhaarSide` | `'FRONT' \| 'BACK'` | Yes | `IsOptional`, `IsIn` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [analyzeStoredIdCard](./endpoints/digio-controller.md).

## AppVersionQueryDto {#app-version-query-dto}

**Use:** query. **Source:** `apps/api/src/modules/app-update/dto/app-version.dto.ts:5`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `platform` | `string` | Yes | `IsOptional`, `IsString` |
| `current_version_code` | `number` | Yes | `IsOptional`, `IsInt` |
| `current_version_name` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [getVersion](./endpoints/app-update-controller.md).

## AppVersionResponseDto {#app-version-response-dto}

**Use:** response. **Source:** `apps/api/src/modules/app-update/dto/app-version.dto.ts:23`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `latestVersion` | `string` | No | None declared on property |
| `latestVersionCode` | `number` | No | None declared on property |
| `minSupportedVersionCode` | `number` | No | None declared on property |
| `hasUpdate` | `boolean` | No | None declared on property |
| `forceUpdate` | `boolean` | No | None declared on property |
| `title` | `string` | No | None declared on property |
| `message` | `string` | No | None declared on property |
| `releaseNotes` | `string[]` | No | None declared on property |
| `playStoreUrl` | `string` | No | None declared on property |
| `webFallbackUrl` | `string` | No | None declared on property |
| `apkUrl` | `string` | No | None declared on property |
| `publishedAt` | `string` | No | None declared on property |

**Referenced by:** [getVersion](./endpoints/app-update-controller.md).

## ArriveAtStopDto {#arrive-at-stop-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:1`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `driverLatitude` | `number` | No | None declared on property |
| `driverLongitude` | `number` | No | None declared on property |

**Referenced by:** [arriveAtStop](./endpoints/corporate-trip-execution-controller.md).

## AssignCorporateTicketDto {#assign-corporate-ticket-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/safety/safety.types.ts:120`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `assignedToUserId` | `string \| null` | No | None declared on property |
| `notes` | `string` | Yes | None declared on property |

**Referenced by:** [assignTicket](./endpoints/corporate-support-ticket-controller.md).

## AudienceFilterDto {#audience-filter-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:44`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `role` | `'ALL' \| UserRole` | Yes | `IsOptional`, `IsString` |
| `platform` | `'ALL' \| DevicePlatform` | Yes | `IsOptional`, `IsString` |
| `availability` | `'ALL' \| DriverAvailability` | Yes | `IsOptional`, `IsString` |
| `verificationStatus` | `'ALL' \| VerificationStatus` | Yes | `IsOptional`, `IsString` |
| `vehicleTypes` | `string[]` | Yes | `IsOptional`, `IsArray` |
| `city` | `string` | Yes | `IsOptional`, `IsString` |
| `userIds` | `string[]` | Yes | `IsOptional`, `IsArray`, `IsString` |
| `phones` | `string[]` | Yes | `IsOptional`, `IsArray`, `IsString` |
| `topic` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [estimateAudience](./endpoints/notifications-controller.md).

## BroadcastPushDto {#broadcast-push-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:84`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `title` | `string` | No | `IsNotEmpty`, `IsString` |
| `body` | `string` | No | `IsNotEmpty`, `IsString` |
| `imageUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `actionUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `priority` | `'normal' \| 'high'` | Yes | `IsOptional`, `IsString` |
| `filter` | `AudienceFilterDto` | Yes | `IsOptional`, `ValidateNested` |
| `data` | `Record<string, string>` | Yes | `IsOptional`, `IsObject` |
| `dryRun` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `bypassQuietHours` | `boolean` | Yes | `IsOptional`, `IsBoolean` |

**Referenced by:** [broadcastPush](./endpoints/notifications-controller.md).

## CancelRequirementDto {#cancel-requirement-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/requirement.dto.ts:122`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [cancelRequirement](./endpoints/requirements-controller.md).

## CancelRouteDto {#cancel-route-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/operations/operations.types.ts:86`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsString`, `IsNotEmpty` |

**Referenced by:** [cancel](./endpoints/corporate-route-cancellation-controller.md).

## CancelTripDto {#cancel-trip-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/trip.dto.ts:42`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [cancelTrip](./endpoints/trips-controller.md).

## ClaimReferralResponseDto

**Use:** response. **Source:** `packages/contracts/src/dtos/driver.dto.ts:547`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `success` | `boolean` | No | None declared on property |
| `claimedAmountRupees` | `number` | No | None declared on property |
| `newWalletBalance` | `number` | No | None declared on property |
| `claimedReferralIds` | `string[]` | No | None declared on property |
| `message` | `string` | No | None declared on property |

**Referenced by:** [claimReward](./endpoints/referrals-controller.md), [claimAllRewards](./endpoints/referrals-controller.md).

## CommitPlanDto {#commit-plan-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:198`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tenantId` | `string` | No | None declared on property |
| `officeId` | `string` | No | None declared on property |
| `shiftDate` | `string` | No | None declared on property |
| `shiftTime` | `string` | No | None declared on property |
| `direction` | `'LOGIN' \| 'LOGOUT'` | No | None declared on property |
| `vehicleCategory` | `PlannerVehicleCategory` | Yes | None declared on property |
| `cabCapacity` | `number` | Yes | None declared on property |
| `stopDwellMinutes` | `number` | Yes | None declared on property |
| `includeMetadata` | `boolean` | Yes | None declared on property |
| `plan` | `PlanRoutesResult` | No | None declared on property |

**Referenced by:** [commitPlan](./endpoints/corporate-routing-controller.md).

## CompleteTripDto {#complete-trip-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/trip.dto.ts:24`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `currentLocation` | `GeoLocationDto` | No | `ValidateNested` |
| `tollCharges` | `number` | Yes | `IsOptional`, `IsNumber` |
| `parkingCharges` | `number` | Yes | `IsOptional`, `IsNumber` |
| `notes` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [completeTrip](./endpoints/trips-controller.md).

## ConfirmSafeDropDto {#confirm-safe-drop-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-safety.dto.ts:39`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `confirmedByRole` | `'DRIVER' \| 'EMPLOYEE'` | No | None declared on property |
| `notes` | `string` | Yes | None declared on property |

**Referenced by:** [confirmSafeDrop](./endpoints/corporate-safety-controller.md).

## ConfirmSafeReachDto {#confirm-safe-reach-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-safety.dto.ts:44`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `stopId` | `string` | No | None declared on property |
| `routeId` | `string` | No | None declared on property |
| `employeeId` | `string` | Yes | None declared on property |
| `confirmedSafely` | `boolean` | No | None declared on property |
| `latitude` | `number` | Yes | None declared on property |
| `longitude` | `number` | Yes | None declared on property |
| `notes` | `string` | Yes | None declared on property |

**Referenced by:** [confirmSafeReach](./endpoints/corporate-safety-controller.md).

## CouponMetricsDto {#coupon-metrics-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:197`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `totalCoupons` | `number` | No | None declared on property |
| `activeCoupons` | `number` | No | None declared on property |
| `totalRedemptions` | `number` | No | None declared on property |
| `totalDiscountDisbursed` | `number` | No | None declared on property |

**Referenced by:** [getCouponMetrics](./endpoints/admin-coupons-controller.md).

## CouponRedemptionResponseDto {#coupon-redemption-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:183`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `couponId` | `string` | No | None declared on property |
| `userId` | `string` | No | None declared on property |
| `userName` | `string` | Yes | None declared on property |
| `userPhone` | `string` | Yes | None declared on property |
| `referenceType` | `string` | No | None declared on property |
| `referenceId` | `string` | No | None declared on property |
| `orderAmount` | `number` | No | None declared on property |
| `discountAmount` | `number` | No | None declared on property |
| `finalAmount` | `number` | No | None declared on property |
| `redeemedAt` | `string` | No | None declared on property |

**Referenced by:** [getCouponRedemptions](./endpoints/admin-coupons-controller.md).

## CouponResponseDto {#coupon-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:161`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `code` | `string` | No | None declared on property |
| `title` | `string` | No | None declared on property |
| `description` | `string \| null` | Yes | None declared on property |
| `discountType` | `CouponDiscountType` | No | None declared on property |
| `discountValue` | `number` | No | None declared on property |
| `maxDiscountAmount` | `number \| null` | Yes | None declared on property |
| `minOrderAmount` | `number` | No | None declared on property |
| `applicableTo` | `CouponApplicableContext` | No | None declared on property |
| `usageLimitTotal` | `number \| null` | Yes | None declared on property |
| `usageLimitPerUser` | `number` | No | None declared on property |
| `usedCount` | `number` | No | None declared on property |
| `validFrom` | `string` | No | None declared on property |
| `validUntil` | `string` | No | None declared on property |
| `isActive` | `boolean` | No | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |
| `redemptionsCount` | `number` | Yes | None declared on property |
| `totalDiscountDisbursed` | `number` | Yes | None declared on property |

**Referenced by:** [getAvailableCoupons](./endpoints/coupons-controller.md), [listCoupons](./endpoints/admin-coupons-controller.md), [getCouponById](./endpoints/admin-coupons-controller.md), [createCoupon](./endpoints/admin-coupons-controller.md), [updateCoupon](./endpoints/admin-coupons-controller.md).

## CouponValidationResponseDto {#coupon-validation-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:148`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `valid` | `boolean` | No | None declared on property |
| `couponId` | `string` | Yes | None declared on property |
| `code` | `string` | Yes | None declared on property |
| `title` | `string` | Yes | None declared on property |
| `discountType` | `CouponDiscountType` | Yes | None declared on property |
| `discountValue` | `number` | Yes | None declared on property |
| `discountAmount` | `number` | Yes | None declared on property |
| `originalAmount` | `number` | Yes | None declared on property |
| `finalAmount` | `number` | Yes | None declared on property |
| `message` | `string` | Yes | None declared on property |

**Referenced by:** [validateCoupon](./endpoints/coupons-controller.md).

## CreateBlogDto {#create-blog-dto}

**Use:** request body. **Source:** `apps/api/src/modules/blogs/dto/create-blog.dto.ts:10`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `title` | `string` | No | `IsString`, `IsNotEmpty` |
| `slug` | `string` | Yes | `IsString`, `IsOptional` |
| `excerpt` | `string` | No | `IsString`, `IsNotEmpty` |
| `content` | `string` | No | `IsString`, `IsNotEmpty` |
| `category` | `string` | No | `IsString`, `IsNotEmpty` |
| `tags` | `string[]` | Yes | `IsArray`, `IsString`, `IsOptional` |
| `coverImage` | `string` | Yes | `IsString`, `IsOptional` |
| `authorName` | `string` | Yes | `IsString`, `IsOptional` |
| `authorRole` | `string` | Yes | `IsString`, `IsOptional` |
| `status` | `BlogStatusEnum` | Yes | `IsEnum`, `IsOptional` |
| `readTime` | `string` | Yes | `IsString`, `IsOptional` |
| `seoTitle` | `string` | Yes | `IsString`, `IsOptional` |
| `seoDescription` | `string` | Yes | `IsString`, `IsOptional` |
| `seoKeywords` | `string` | Yes | `IsString`, `IsOptional` |

**Referenced by:** [create](./endpoints/admin-blogs-controller.md).

## CreateCorporateEmployeeDto {#create-corporate-employee-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:138`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `officeId` | `string` | No | None declared on property |
| `employeeCode` | `string` | No | None declared on property |
| `fullName` | `string` | No | None declared on property |
| `email` | `string` | No | None declared on property |
| `phoneNumber` | `string` | No | None declared on property |
| `gender` | `CorporateGender` | No | None declared on property |
| `department` | `string` | Yes | None declared on property |
| `costCenter` | `string` | Yes | None declared on property |
| `homeAddress` | `string` | No | None declared on property |
| `landmark` | `string` | Yes | None declared on property |
| `latitude` | `number` | Yes | None declared on property |
| `longitude` | `number` | Yes | None declared on property |

**Referenced by:** [createEmployee](./endpoints/corporate-tenant-controller.md).

## CreateCorporateOfficeDto {#create-corporate-office-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:105`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `code` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `addressText` | `string` | No | None declared on property |
| `latitude` | `number` | No | None declared on property |
| `longitude` | `number` | No | None declared on property |
| `city` | `string` | Yes | None declared on property |
| `state` | `string` | Yes | None declared on property |
| `pinCode` | `string` | Yes | None declared on property |
| `country` | `string` | Yes | None declared on property |
| `contactName` | `string` | Yes | None declared on property |
| `contactEmail` | `string` | Yes | None declared on property |
| `contactPhone` | `string` | Yes | None declared on property |
| `isActive` | `boolean` | Yes | None declared on property |

**Referenced by:** [createOffice](./endpoints/corporate-tenant-controller.md).

## CreateCorporateRateCardDto {#create-corporate-rate-card-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/billing/corporate-billing-wire.types.ts:6`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tenantId` | `string` | No | None declared on property |
| `vehicleCategory` | `string` | Yes | None declared on property |
| `baseFarePaise` | `PaiseInput` | No | None declared on property |
| `baseDistanceMeters` | `number` | Yes | None declared on property |
| `perKmPaise` | `PaiseInput` | No | None declared on property |
| `perExtraStopPaise` | `PaiseInput` | Yes | None declared on property |
| `perHourPaise` | `PaiseInput \| null` | Yes | None declared on property |
| `minimumPaise` | `PaiseInput` | Yes | None declared on property |
| `noShowPaise` | `PaiseInput` | Yes | None declared on property |
| `cancellationPaise` | `PaiseInput` | Yes | None declared on property |
| `effectiveFrom` | `string` | No | None declared on property |

**Referenced by:** [createCorporateCard](./endpoints/corporate-rate-card-controller.md).

## CreateCorporateSupportTicketDto {#create-corporate-support-ticket-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/safety/safety.types.ts:70`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `employeeId` | `string` | Yes | None declared on property |
| `tenantId` | `string` | Yes | None declared on property |
| `category` | `CorporateTicketCategory` | No | None declared on property |
| `priority` | `CorporateTicketPriority` | Yes | None declared on property |
| `subject` | `string` | No | None declared on property |
| `description` | `string` | No | None declared on property |
| `routeId` | `string` | Yes | None declared on property |
| `stopId` | `string` | Yes | None declared on property |

**Referenced by:** [createTicket](./endpoints/corporate-support-ticket-controller.md).

## CreateCorporateTenantDto {#create-corporate-tenant-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:3`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `code` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `legalEntityName` | `string` | No | None declared on property |
| `gstin` | `string` | Yes | None declared on property |
| `cin` | `string` | Yes | None declared on property |
| `industry` | `string` | Yes | None declared on property |
| `website` | `string` | Yes | None declared on property |
| `registeredAddress` | `string` | Yes | None declared on property |
| `city` | `string` | Yes | None declared on property |
| `state` | `string` | Yes | None declared on property |
| `pinCode` | `string` | Yes | None declared on property |
| `country` | `string` | Yes | None declared on property |
| `primaryContactName` | `string` | Yes | None declared on property |
| `primaryContactEmail` | `string` | Yes | None declared on property |
| `primaryContactPhone` | `string` | Yes | None declared on property |
| `createPortalAdmin` | `boolean` | Yes | None declared on property |
| `billingAddress` | `string` | Yes | None declared on property |
| `billingSameAsRegistered` | `boolean` | Yes | None declared on property |
| `officeName` | `string` | Yes | None declared on property |
| `officeLatitude` | `number` | Yes | None declared on property |
| `officeLongitude` | `number` | Yes | None declared on property |

**Referenced by:** [createTenant](./endpoints/corporate-tenant-controller.md).

## CreateCorporateTicketMessageDto {#create-corporate-ticket-message-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/safety/safety.types.ts:115`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `message` | `string` | No | None declared on property |
| `isInternal` | `boolean` | Yes | None declared on property |

**Referenced by:** [createMessage](./endpoints/corporate-support-ticket-controller.md).

## CreateCorporateTransportZoneDto {#create-corporate-transport-zone-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:123`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `officeId` | `string` | No | None declared on property |
| `code` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `description` | `string` | Yes | None declared on property |
| `serviceArea` | `string` | No | None declared on property |
| `pickupLocations` | `string[]` | Yes | None declared on property |
| `dropLocations` | `string[]` | Yes | None declared on property |
| `isActive` | `boolean` | Yes | None declared on property |

**Referenced by:** [createTransportZone](./endpoints/corporate-tenant-controller.md).

## CreateCouponDto {#create-coupon-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:14`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `code` | `string` | No | `IsNotEmpty`, `IsString` |
| `title` | `string` | No | `IsNotEmpty`, `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |
| `discountType` | `CouponDiscountType` | No | `IsNotEmpty`, `IsEnum` |
| `discountValue` | `number` | No | `IsNumber`, `Min` |
| `maxDiscountAmount` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `minOrderAmount` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `applicableTo` | `CouponApplicableContext` | Yes | `IsOptional`, `IsEnum` |
| `usageLimitTotal` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `usageLimitPerUser` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `validFrom` | `string` | No | `IsNotEmpty`, `IsDateString` |
| `validUntil` | `string` | No | `IsNotEmpty`, `IsDateString` |
| `isActive` | `boolean` | Yes | `IsOptional`, `IsBoolean` |

**Referenced by:** [createCoupon](./endpoints/admin-coupons-controller.md).

## CreateDigilockerRequestDto {#create-digilocker-request-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:355`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `customerIdentifier` | `string` | Yes | `IsOptional`, `IsString` |
| `customerName` | `string` | Yes | `IsOptional`, `IsString` |
| `templateName` | `string` | Yes | `IsOptional`, `IsString` |
| `redirectUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `notifyCustomer` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `presetValues` | `Record<string, unknown>` | Yes | `IsOptional`, `IsObject` |

**Referenced by:** [createDigilockerSession](./endpoints/digio-controller.md).

## CreateDisputeDto {#create-dispute-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/dispute.dto.ts:12`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tripId` | `string` | No | `IsString` |
| `accusedId` | `string` | Yes | `IsOptional`, `IsString` |
| `reason` | `string` | No | `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [createDispute](./endpoints/disputes-controller.md).

## CreateDistancePricingPlanDto {#create-distance-pricing-plan-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:177`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `vehicleCategory` | `string` | Yes | `IsOptional`, `IsString` |
| `version` | `string` | Yes | `IsOptional`, `IsString` |
| `name` | `string` | Yes | `IsOptional`, `IsString` |
| `cloneFromPlanId` | `string` | Yes | `IsOptional`, `IsUUID` |
| `slabs` | `CreatePricingSlabInputDto[]` | Yes | `IsOptional`, `IsArray`, `ValidateNested` |
| `peakWindows` | `PeakHourWindowDto[]` | Yes | `IsOptional`, `IsArray`, `ArrayMaxSize`, `ValidateNested` |
| `config` | `RateCardConfigDto \| Record<string, any>` | Yes | `IsOptional`, `IsObject` |

**Referenced by:** [createPlan](./endpoints/admin-pricing-controller.md).

## CreateDriverRateCardDto {#create-driver-rate-card-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/billing/corporate-billing-wire.types.ts:21`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `vehicleCategory` | `string` | Yes | None declared on property |
| `basePayoutPaise` | `PaiseInput` | No | None declared on property |
| `baseDistanceMeters` | `number` | Yes | None declared on property |
| `perKmPaise` | `PaiseInput` | No | None declared on property |
| `tollReimbursementPaise` | `PaiseInput` | Yes | None declared on property |
| `perHourPaise` | `PaiseInput \| null` | Yes | None declared on property |
| `minimumPaise` | `PaiseInput` | Yes | None declared on property |
| `noShowPaise` | `PaiseInput` | Yes | None declared on property |
| `cancellationPaise` | `PaiseInput` | Yes | None declared on property |
| `effectiveFrom` | `string` | No | None declared on property |

**Referenced by:** [createDriverCard](./endpoints/corporate-rate-card-controller.md).

## CreateEmployeeLocationDto {#create-employee-location-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:168`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `addressText` | `string` | No | None declared on property |
| `landmark` | `string` | Yes | None declared on property |
| `latitude` | `number` | No | None declared on property |
| `longitude` | `number` | No | None declared on property |
| `isDefault` | `boolean` | Yes | None declared on property |

**Referenced by:** [addEmployeeLocation](./endpoints/corporate-tenant-controller.md).

## CreateEnterpriseLeadDto {#create-enterprise-lead-dto}

**Use:** request body. **Source:** `apps/api/src/modules/leads/dto/create-lead.dto.ts:4`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `companyName` | `string` | No | `IsString`, `IsNotEmpty` |
| `contactName` | `string` | No | `IsString`, `IsNotEmpty` |
| `email` | `string` | No | `IsEmail`, `IsNotEmpty` |
| `phone` | `string` | No | `IsString`, `IsNotEmpty` |
| `city` | `string` | Yes | `IsString`, `IsOptional` |
| `fleetRequirements` | `string` | Yes | `IsString`, `IsOptional` |
| `monthlyTripsEstimate` | `string` | Yes | `IsString`, `IsOptional` |
| `preferredVehicles` | `string` | Yes | `IsString`, `IsOptional` |
| `notes` | `string` | Yes | `IsString`, `IsOptional` |

**Referenced by:** [createEnterpriseLead](./endpoints/leads-controller.md).

## CreateFeatureFlagDto {#create-feature-flag-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/feature-flag.dto.ts:17`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `key` | `string` | No | `IsNotEmpty`, `IsString`, `Matches` |
| `name` | `string` | No | `IsNotEmpty`, `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |
| `category` | `string` | Yes | `IsOptional`, `IsString` |
| `isEnabled` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `metadata` | `Record<string, any>` | Yes | `IsOptional`, `IsObject` |

**Referenced by:** [createFeatureFlag](./endpoints/admin-feature-flags-controller.md).

## CreateHolidayInput {#create-holiday-input}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:18`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `officeId` | `string \| null` | Yes | None declared on property |
| `holidayDate` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |

**Referenced by:** [createHoliday](./endpoints/corporate-scheduling-controller.md).

## CreateOrgUnitInput {#create-org-unit-input}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/tenants/corporate-org-structure.service.ts:7`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `code` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `departmentHead` | `string` | Yes | None declared on property |
| `officeId` | `string` | Yes | None declared on property |
| `description` | `string` | Yes | None declared on property |
| `isActive` | `boolean` | Yes | None declared on property |

**Referenced by:** [createDepartment](./endpoints/corporate-tenant-controller.md), [updateDepartment](./endpoints/corporate-tenant-controller.md), [createCostCenter](./endpoints/corporate-tenant-controller.md).

## CreatePayoutBatchRequestDto {#create-payout-batch-request-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/billing/corporate-billing-wire.types.ts:39`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `driverIds` | `string[]` | Yes | None declared on property |
| `cutoffDate` | `string` | Yes | None declared on property |
| `idempotencyKey` | `string` | Yes | None declared on property |

**Referenced by:** [createPayoutBatch](./endpoints/corporate-billing-controller.md).

## CreateRequirementDto {#create-requirement-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/requirement.dto.ts:18`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fulfillmentMode` | `FulfillmentMode` | Yes | `IsOptional`, `IsEnum` |
| `vehicleType` | `string` | No | `IsString`, `IsNotEmpty` |
| `quantity` | `number` | No | `IsInt`, `Min` |
| `pickupLocation` | `GeoLocationDto` | No | `ValidateNested` |
| `dropLocation` | `GeoLocationDto` | No | `ValidateNested` |
| `reportingTime` | `string` | No | `IsDateString` |
| `ratePerVehicle` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `suggestedBudget` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `notes` | `string` | Yes | `IsOptional`, `IsString` |
| `couponCode` | `string` | Yes | `IsOptional`, `IsString` |
| `quoteId` | `string` | Yes | `IsOptional`, `IsUUID` |
| `zonalQuoteId` | `string` | Yes | `IsOptional`, `IsUUID` |
| `isScheduled` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `hasEscort` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `scheduledTriggerTime` | `string` | Yes | `IsOptional`, `IsDateString` |

**Referenced by:** [createRequirement](./endpoints/requirements-controller.md).

## CreateReviewDto {#create-review-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/review.dto.ts:10`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tripId` | `string` | No | `IsString` |
| `revieweeId` | `string` | Yes | `IsOptional`, `IsString` |
| `rating` | `number` | No | `IsInt`, `Min`, `Max` |
| `feedback` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [createReview](./endpoints/reviews-controller.md).

## CreateShiftTemplateInput {#create-shift-template-input}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/scheduling/corporate-shift-template.service.ts:7`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `officeId` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `loginTime` | `string` | No | None declared on property |
| `logoutTime` | `string` | No | None declared on property |
| `weekdays` | `number[]` | Yes | None declared on property |
| `isOvernight` | `boolean` | Yes | None declared on property |

**Referenced by:** [createShiftTemplate](./endpoints/corporate-scheduling-controller.md).

## CreateSupportQueryDto {#create-support-query-dto}

**Use:** request body. **Source:** `apps/api/src/modules/disputes/dto/create-support-query.dto.ts:4`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `category` | `string` | No | `IsNotEmpty`, `IsString` |
| `subject` | `string` | No | `IsNotEmpty`, `IsString` |
| `description` | `string` | No | `IsNotEmpty`, `IsString` |
| `tripId` | `string` | Yes | `IsOptional`, `IsString` |
| `priority` | `string` | Yes | `IsOptional`, `IsString` |
| `companyName` | `string` | Yes | `IsOptional`, `IsString` |
| `contactPerson` | `string` | Yes | `IsOptional`, `IsString` |
| `contactPhone` | `string` | Yes | `IsOptional`, `IsString` |
| `contactEmail` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [createSupportQuery](./endpoints/disputes-controller.md).

## CreateSupportTicketDto {#create-support-ticket-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/rider/corporate-rider.types.ts:227`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `category` | `CorporateTicketCategory` | No | None declared on property |
| `priority` | `CorporateTicketPriority` | Yes | None declared on property |
| `subject` | `string` | No | None declared on property |
| `description` | `string` | No | None declared on property |
| `routeId` | `string` | Yes | None declared on property |
| `stopId` | `string` | Yes | None declared on property |

**Referenced by:** [createTicket](./endpoints/corporate-rider-controller.md).

## CreateTenantPolicyInput {#create-tenant-policy-input}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/tenants/corporate-tenant-policy.service.ts:32`.

Type alias: `Partial<CorporateTenantPolicyValues> & { effectiveFrom?: string | Date }`.

**Referenced by:** [createPolicyVersion](./endpoints/corporate-tenant-controller.md).

## CreateVehicleCategoryDto {#create-vehicle-category-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:421`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `vehicleType` | `string` | No | `IsNotEmpty`, `IsString` |
| `categoryLabel` | `string` | No | `IsNotEmpty`, `IsString` |
| `seatingCapacity` | `string` | No | `IsNotEmpty`, `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |
| `iconKey` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [createPricingTier](./endpoints/pricing-controller.md).

## CreateVendorDto {#create-vendor-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:29`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `organizationName` | `string` | No | `IsNotEmpty`, `IsString` |
| `fullName` | `string` | No | `IsNotEmpty`, `IsString` |
| `phone` | `string` | No | `IsNotEmpty`, `IsString` |
| `email` | `string` | Yes | `IsOptional`, `IsEmail` |
| `gstNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `address` | `string` | Yes | `IsOptional`, `IsString` |
| `city` | `string` | Yes | `IsOptional`, `IsString` |
| `verificationStatus` | `VerificationStatus` | Yes | `IsOptional`, `IsEnum` |

**Referenced by:** [createVendor](./endpoints/admin-controller.md).

## DeclineOfferDto {#decline-offer-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/offer.dto.ts:34`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [declineOffer](./endpoints/offers-controller.md).

## DisputeQueryDto {#dispute-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/dispute.dto.ts:42`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `DisputeStatus` | Yes | `IsOptional`, `IsEnum` |
| `tripId` | `string` | Yes | `IsOptional`, `IsString` |
| `page` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |
| `limit` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |

**Referenced by:** [getDisputes](./endpoints/disputes-controller.md).

## DisputeResponseDto {#dispute-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/dispute.dto.ts:64`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `tripId` | `string` | No | None declared on property |
| `reporterId` | `string` | No | None declared on property |
| `accusedId` | `string` | No | None declared on property |
| `reason` | `string` | No | None declared on property |
| `description` | `string` | Yes | None declared on property |
| `status` | `DisputeStatus` | No | None declared on property |
| `resolutionText` | `string` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |
| `reporterName` | `string` | Yes | None declared on property |
| `accusedName` | `string` | Yes | None declared on property |

**Referenced by:** [createDispute](./endpoints/disputes-controller.md), [getDisputes](./endpoints/disputes-controller.md), [getMyDisputes](./endpoints/disputes-controller.md), [getDisputeById](./endpoints/disputes-controller.md), [resolveDispute](./endpoints/disputes-controller.md).

## DistancePricingPlanDto {#distance-pricing-plan-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:275`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `vehicleCategory` | `string` | No | None declared on property |
| `version` | `string` | No | None declared on property |
| `name` | `string \| null` | Yes | None declared on property |
| `displayName` | `string \| null` | Yes | None declared on property |
| `status` | `'DRAFT' \| 'ACTIVE' \| 'SCHEDULED' \| 'RETIRED'` | No | None declared on property |
| `effectiveFrom` | `string` | No | None declared on property |
| `effectiveTo` | `string \| null` | Yes | None declared on property |
| `createdBy` | `string \| null` | Yes | None declared on property |
| `publishedBy` | `string \| null` | Yes | None declared on property |
| `publishedAt` | `string \| null` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |
| `peakWindows` | `PeakHourWindowDto[]` | Yes | None declared on property |
| `config` | `RateCardConfigDto \| null` | Yes | None declared on property |
| `escortFeePaise` | `number` | Yes | None declared on property |
| `escortFeeRupees` | `number` | Yes | None declared on property |
| `slabs` | `DistancePricingSlabDto[]` | No | None declared on property |
| `slabCount` | `number` | Yes | None declared on property |

**Referenced by:** [listPlans](./endpoints/admin-pricing-controller.md), [createPlan](./endpoints/admin-pricing-controller.md), [getPlan](./endpoints/admin-pricing-controller.md), [updateSlabs](./endpoints/admin-pricing-controller.md), [publishPlan](./endpoints/admin-pricing-controller.md), [retirePlan](./endpoints/admin-pricing-controller.md).

## DriverLocationPingDto {#driver-location-ping-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:28`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `latitude` | `number` | No | `IsLatitude` |
| `longitude` | `number` | No | `IsLongitude` |
| `accuracyM` | `number` | Yes | `IsOptional`, `IsNumber`, `Min`, `Max` |
| `source` | `'GPS' \| 'LAST_KNOWN' \| 'NETWORK' \| 'IP'` | Yes | `IsOptional`, `IsIn` |
| `recordedAt` | `string` | Yes | `IsOptional`, `IsDateString` |

**Referenced by:** [reportLocation](./endpoints/drivers-controller.md).

## DriverReferralDashboardDto

**Use:** response. **Source:** `packages/contracts/src/dtos/driver.dto.ts:526`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `referralCode` | `string` | No | None declared on property |
| `phone` | `string` | Yes | None declared on property |
| `totalReferrals` | `number` | No | None declared on property |
| `verifiedReferrals` | `number` | No | None declared on property |
| `vaultLockedRupees` | `number` | No | None declared on property |
| `claimableRupees` | `number` | No | None declared on property |
| `claimedRupees` | `number` | No | None declared on property |
| `completedRides` | `number` | No | None declared on property |
| `milestoneRides` | `number` | No | None declared on property |
| `milestoneReached` | `boolean` | No | None declared on property |
| `ridesRemainingToMilestone` | `number` | No | None declared on property |
| `currentTier` | `'BRONZE' \| 'SILVER' \| 'GOLD'` | No | None declared on property |
| `currentRewardRupees` | `number` | No | None declared on property |
| `nextTier` | `'SILVER' \| 'GOLD'` | Yes | None declared on property |
| `referralsToNextTier` | `number` | Yes | None declared on property |
| `activeRefereesCount` | `number` | Yes | None declared on property |
| `completedMilestonesCount` | `number` | Yes | None declared on property |
| `referees` | `DriverReferralItemDto[]` | No | None declared on property |

**Referenced by:** [getDashboard](./endpoints/referrals-controller.md).

## DriverTripPayoutDto {#driver-trip-payout-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:390`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tripId` | `string` | No | None declared on property |
| `driverPayoutPaise` | `number` | No | None declared on property |
| `driverPayoutRupees` | `number` | No | None declared on property |
| `routeDistanceM` | `number \| null` | No | None declared on property |
| `displayedKm` | `number \| null` | No | None declared on property |
| `pickupAddress` | `string` | No | None declared on property |
| `dropAddress` | `string` | No | None declared on property |
| `reportingTime` | `string` | No | None declared on property |
| `status` | `string` | No | None declared on property |

**Referenced by:** [getDriverTripDetails](./endpoints/driver-quote-controller.md).

## DriverWalletSummaryDto {#driver-wallet-summary-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/settlement.dto.ts:70`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `walletBalance` | `number` | No | None declared on property |
| `availableBalance` | `number` | Yes | None declared on property |
| `totalEarned` | `number` | No | None declared on property |
| `totalWithdrawn` | `number` | No | None declared on property |
| `pendingSettlements` | `number` | No | None declared on property |
| `hasPendingWithdrawal` | `boolean` | Yes | None declared on property |
| `recentLedgerEntries` | `LedgerEntryResponseDto[]` | No | None declared on property |
| `withdrawals` | `SettlementResponseDto[]` | Yes | None declared on property |

**Referenced by:** [getWallet](./endpoints/ledger-controller.md).

## EmergencyBoardingFallbackDto {#emergency-boarding-fallback-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-safety.dto.ts:54`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `routeId` | `string` | No | None declared on property |
| `stopId` | `string` | No | None declared on property |
| `supervisorUserId` | `string` | No | None declared on property |
| `reason` | `\| 'EMPLOYEE_PHONE_BATTERY_DEAD'     \| 'CARRIER_SMS_DELAY'     \| 'MOBILE_APP_NETWORK_OUTAGE'     \| 'PHYSICAL_BADGE_VERIFIED'     \| 'SUPERVISOR_DIRECT_AUTHORIZATION'` | No | None declared on property |
| `verificationEvidence` | `string` | Yes | None declared on property |
| `notes` | `string` | Yes | None declared on property |

**Referenced by:** [emergencyBoardingOverride](./endpoints/corporate-safety-controller.md).

## FaceMatchStoredDto {#face-match-stored-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:324`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `image1Url` | `string` | Yes | `IsOptional`, `IsString` |
| `image2Url` | `string` | Yes | `IsOptional`, `IsString` |
| `minimumMatch` | `number` | Yes | `IsOptional`, `IsNumber`, `Min`, `Max` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [faceMatchStored](./endpoints/digio-controller.md).

## FeatureFlagDto {#feature-flag-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/feature-flag.dto.ts:3`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `key` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `description` | `string \| null` | Yes | None declared on property |
| `category` | `string` | No | None declared on property |
| `isEnabled` | `boolean` | No | None declared on property |
| `metadata` | `Record<string, any> \| null` | Yes | None declared on property |
| `createdBy` | `string \| null` | Yes | None declared on property |
| `updatedBy` | `string \| null` | Yes | None declared on property |
| `createdAt` | `string \| Date` | No | None declared on property |
| `updatedAt` | `string \| Date` | No | None declared on property |

**Referenced by:** [listAdminFeatureFlags](./endpoints/admin-feature-flags-controller.md), [createFeatureFlag](./endpoints/admin-feature-flags-controller.md), [updateFeatureFlag](./endpoints/admin-feature-flags-controller.md), [toggleFeatureFlag](./endpoints/admin-feature-flags-controller.md).

## FuzzyMatchDto {#fuzzy-match-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:239`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `sourceText` | `string` | No | `IsNotEmpty`, `IsString` |
| `targetText` | `string` | No | `IsNotEmpty`, `IsString` |
| `context` | `'name' \| 'address'` | No | `IsNotEmpty`, `IsIn` |
| `minConfidence` | `number` | Yes | `IsOptional`, `IsNumber`, `Min`, `Max` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [fuzzyMatch](./endpoints/digio-controller.md).

## GenerateInvoiceBatchDto {#generate-invoice-batch-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-billing.dto.ts:3`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tenantId` | `string` | No | None declared on property |
| `billingPeriodStart` | `string` | No | None declared on property |
| `billingPeriodEnd` | `string` | No | None declared on property |
| `gstRatePct` | `number` | Yes | None declared on property |

**Referenced by:** [generateInvoiceBatch](./endpoints/corporate-billing-controller.md).

## HealthReport

**Use:** response. **Source:** `apps/api/src/modules/health/health.service.ts:5`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `'OK' \| 'DEGRADED' \| 'DOWN'` | No | None declared on property |
| `timestamp` | `string` | No | None declared on property |
| `uptimeSeconds` | `number` | No | None declared on property |
| `components` | `{     database: { status: 'UP' \| 'DOWN'; latencyMs?: number };     redis: { status: 'UP' \| 'DOWN'; latencyMs?: number };     memory: {       heapUsedMb: number;       heapTotalMb: number;       rssMb: number;     };   }` | No | None declared on property |

**Referenced by:** [getHealth](./endpoints/health-controller.md).

## InitiatePaymentDto {#initiate-payment-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/payment.dto.ts:5`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `requirementId` | `string` | No | `IsNotEmpty`, `IsString` |
| `amount` | `number` | No | `IsNumber`, `Min` |
| `paymentMethod` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [initiatePayment](./endpoints/payments-controller.md).

## InviteCorporateUserInput {#invite-corporate-user-input}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:23`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fullName` | `string` | No | None declared on property |
| `email` | `string` | Yes | None declared on property |
| `phone` | `string` | Yes | None declared on property |
| `password` | `string` | Yes | None declared on property |
| `corporateRole` | `CorporateRole \| string` | No | None declared on property |
| `officeIds` | `string[]` | Yes | None declared on property |

**Referenced by:** [inviteUser](./endpoints/corporate-tenant-controller.md).

## KycSubmissionDto {#kyc-submission-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:52`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `referralCode` | `string` | Yes | `IsOptional`, `IsString` |
| `idNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `dlNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `licenseNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `licenseExpiry` | `string` | Yes | `IsOptional`, `IsString` |
| `panNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `rcNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `profilePhotoUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `dlFrontUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `dlBackUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `rcDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `rcFrontUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `rcBackUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `insuranceDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `vehiclePhotoUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `aadharFrontUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `aadharBackUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `panDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `documentUrls` | `string[]` | Yes | `IsOptional` |
| `documents` | `Array<{ documentType: string; url: string; title?: string }>` | Yes | `IsOptional` |
| `vehicle` | `Record<string, any>` | Yes | `IsOptional` |
| `vehiclePlate` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleType` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleModel` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleColor` | `string` | Yes | `IsOptional`, `IsString` |
| `color` | `string` | Yes | `IsOptional`, `IsString` |
| `modelYear` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleYear` | `string` | Yes | `IsOptional`, `IsString` |
| `insurancePolicyNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `insuranceCompany` | `string` | Yes | `IsOptional`, `IsString` |
| `insuranceExpiry` | `string` | Yes | `IsOptional`, `IsString` |
| `phone` | `string` | Yes | `IsOptional`, `IsString` |
| `email` | `string` | Yes | `IsOptional`, `IsString` |
| `fullName` | `string` | Yes | `IsOptional`, `IsString` |
| `dateOfBirth` | `string` | Yes | `IsOptional`, `IsString` |
| `gender` | `string` | Yes | `IsOptional`, `IsString` |
| `address` | `string` | Yes | `IsOptional`, `IsString` |
| `emergencyContactName` | `string` | Yes | `IsOptional`, `IsString` |
| `emergencyContactPhone` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [submitKyc](./endpoints/drivers-controller.md).

## LedgerEntryResponseDto {#ledger-entry-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/settlement.dto.ts:57`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `accountType` | `string` | No | None declared on property |
| `accountId` | `string` | No | None declared on property |
| `entryType` | `LedgerEntryType` | No | None declared on property |
| `amount` | `number` | No | None declared on property |
| `balanceAfter` | `number` | No | None declared on property |
| `referenceType` | `string` | No | None declared on property |
| `referenceId` | `string` | No | None declared on property |
| `description` | `string` | No | None declared on property |
| `createdAt` | `string` | No | None declared on property |

**Referenced by:** [getLedger](./endpoints/ledger-controller.md).

## LivenessStoredDto {#liveness-stored-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:345`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `imageUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [livenessStored](./endpoints/digio-controller.md).

## LoginDto {#login-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:118`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `identifier` | `string` | No | `IsNotEmpty`, `IsString` |
| `password` | `string` | No | `IsNotEmpty`, `IsString` |
| `role` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [adminLogin](./endpoints/auth-controller.md), [login](./endpoints/auth-controller.md).

## ManageDigilockerApprovalDto {#manage-digilocker-approval-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:381`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `'approved' \| 'rejected'` | No | `IsNotEmpty`, `IsIn` |
| `reason` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [manageDigilockerApproval](./endpoints/digio-controller.md).

## MarkNoShowDto {#mark-no-show-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:28`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | Yes | None declared on property |
| `driverLatitude` | `number` | Yes | None declared on property |
| `driverLongitude` | `number` | Yes | None declared on property |

**Referenced by:** [markNoShow](./endpoints/corporate-trip-execution-controller.md).

## MaskStoredAadhaarDto {#mask-stored-aadhaar-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:310`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `documentUrl` | `string` | No | `IsNotEmpty`, `IsString` |
| `side` | `'FRONT' \| 'BACK'` | Yes | `IsOptional`, `IsIn` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [maskStoredAadhaar](./endpoints/digio-controller.md).

## NotificationInteractionDto {#notification-interaction-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:254`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `action` | `'CLICK' \| 'DISMISS' \| 'OPEN'` | Yes | `IsOptional`, `IsString` |
| `timestamp` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [trackInteraction](./endpoints/notifications-controller.md).

## OfferQueryDto {#offer-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/offer.dto.ts:23`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `OfferStatus` | Yes | `IsOptional` |

**Referenced by:** [getOffers](./endpoints/offers-controller.md).

## OfferResponseDto {#offer-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/offer.dto.ts:5`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `requirementId` | `string` | No | None declared on property |
| `driverId` | `string` | No | None declared on property |
| `vehicleType` | `string` | No | None declared on property |
| `pickupLocation` | `GeoLocationDto` | No | None declared on property |
| `dropLocation` | `GeoLocationDto` | No | None declared on property |
| `reportingTime` | `string` | No | None declared on property |
| `offeredRate` | `number` | No | None declared on property |
| `status` | `OfferStatus` | No | None declared on property |
| `expiresAt` | `string` | No | None declared on property |
| `expiresInSeconds` | `number` | Yes | None declared on property |
| `vendorOrganizationName` | `string` | Yes | None declared on property |
| `zonal` | `Record<string, unknown>` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |

**Referenced by:** [getOffers](./endpoints/offers-controller.md), [getOfferById](./endpoints/offers-controller.md), [acceptOffer](./endpoints/offers-controller.md), [declineOffer](./endpoints/offers-controller.md).

## OnboardCorporateCompanyDto {#onboard-corporate-company-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:67`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `code` | `string` | No | None declared on property |
| `name` | `string` | No | None declared on property |
| `legalEntityName` | `string` | No | None declared on property |
| `gstin` | `string` | Yes | None declared on property |
| `status` | `CorporateTenantStatus` | Yes | None declared on property |
| `office` | `OnboardCorporateOfficeInputDto` | No | None declared on property |
| `adminUser` | `OnboardCorporateAdminInputDto` | No | None declared on property |
| `policy` | `OnboardCorporatePolicyInputDto` | Yes | None declared on property |
| `shiftTemplate` | `OnboardCorporateShiftInputDto` | Yes | None declared on property |

**Referenced by:** [onboardCompany](./endpoints/corporate-tenant-controller.md).

## PaymentResponseDto {#payment-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/payment.dto.ts:20`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `requirementId` | `string` | No | None declared on property |
| `vendorId` | `string` | No | None declared on property |
| `amount` | `number` | No | None declared on property |
| `status` | `PaymentStatus` | No | None declared on property |
| `paymentMethod` | `string` | Yes | None declared on property |
| `transactionRef` | `string` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |

**Referenced by:** [initiatePayment](./endpoints/payments-controller.md), [getPayments](./endpoints/payments-controller.md), [getPayment](./endpoints/payments-controller.md).

## PlanRoutesResult {#plan-routes-result}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/routing/corporate-route-planner.service.ts:145`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `employeeCount` | `number` | No | None declared on property |
| `cabCount` | `number` | No | None declared on property |
| `vehicleCategoryCounts` | `Record<string, number>` | No | None declared on property |
| `officeRadiusKm` | `number` | No | None declared on property |
| `maxTripKm` | `number` | No | None declared on property |
| `warnings` | `string[]` | Yes | None declared on property |
| `outOfRadiusCount` | `number` | No | None declared on property |
| `excludedByDistanceCount` | `number` | No | None declared on property |
| `excludedByDistance` | `Array<{     name: string;     address: string;     matchedAddress?: string;     lat: number;     lng: number;     officeDistanceKm: number;     reason: DistanceExclusionReason;   }>` | No | None declared on property |
| `autoExcludedEmployees` | `string[]` | No | None declared on property |
| `bufferedDeadline` | `string` | No | None declared on property |
| `office` | `{ name: string; lat: number; lng: number }` | No | None declared on property |
| `offices` | `Array<{ name: string; lat: number; lng: number }>` | No | None declared on property |
| `routes` | `SolverCalculatedRoute[]` | No | None declared on property |
| `totalKm` | `number` | No | None declared on property |
| `totalDriverPayout` | `number` | No | None declared on property |
| `expectedCorporateRevenue` | `number` | No | None declared on property |
| `projectedMargin` | `number` | No | None declared on property |

**Referenced by:** [exportPlanToExcel](./endpoints/corporate-routing-controller.md).

## PricingAuditDto {#pricing-audit-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:297`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `actorId` | `string \| null` | Yes | None declared on property |
| `actorName` | `string \| null` | Yes | None declared on property |
| `action` | `string` | No | None declared on property |
| `entityType` | `string` | No | None declared on property |
| `entityId` | `string` | No | None declared on property |
| `oldValueJson` | `any` | Yes | None declared on property |
| `newValueJson` | `any` | Yes | None declared on property |
| `reason` | `string \| null` | Yes | None declared on property |
| `timestamp` | `string` | No | None declared on property |

**Referenced by:** [getAudit](./endpoints/admin-pricing-controller.md).

## PublishPricingPlanDto {#publish-pricing-plan-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:245`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `effectiveFrom` | `string` | Yes | `IsOptional`, `IsDateString` |
| `reason` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [publishPlan](./endpoints/admin-pricing-controller.md).

## QueryBlogDto {#query-blog-dto}

**Use:** query. **Source:** `apps/api/src/modules/blogs/dto/query-blog.dto.ts:6`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `search` | `string` | Yes | `IsString`, `IsOptional` |
| `category` | `string` | Yes | `IsString`, `IsOptional` |
| `tag` | `string` | Yes | `IsString`, `IsOptional` |
| `status` | `BlogStatusEnum` | Yes | `IsEnum`, `IsOptional` |
| `page` | `number` | Yes | `IsInt`, `Min`, `IsOptional` |
| `limit` | `number` | Yes | `IsInt`, `Min`, `IsOptional` |

**Referenced by:** [listPublished](./endpoints/blogs-controller.md), [listAll](./endpoints/admin-blogs-controller.md).

## RaiseInvoiceDisputeDto {#raise-invoice-dispute-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/billing/corporate-billing-wire.types.ts:45`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | None declared on property |
| `claimedAmountPaise` | `PaiseInput` | No | None declared on property |
| `invoiceLineId` | `string` | Yes | None declared on property |

**Referenced by:** [raiseDispute](./endpoints/corporate-billing-controller.md).

## ReactivateDriverDto {#reactivate-driver-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:90`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `notes` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [reactivate](./endpoints/corporate-ops-drivers-controller.md), [activateAccount](./endpoints/corporate-ops-drivers-controller.md), [reactivateDriver](./endpoints/admin-controller.md).

## ReassignRouteDto {#reassign-route-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/operations/operations.types.ts:71`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsString`, `IsNotEmpty` |
| `newDriverId` | `string` | Yes | `IsOptional`, `IsUUID` |

**Referenced by:** [reassign](./endpoints/corporate-operations-controller.md).

## RecordAadhaarConsentDto {#record-aadhaar-consent-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:459`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `accepted` | `boolean` | No | `IsBoolean`, `Equals` |
| `textVersion` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [recordAadhaarConsent](./endpoints/digio-controller.md).

## RefreshTokenDto {#refresh-token-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:180`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `refreshToken` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [refresh](./endpoints/auth-controller.md).

## RegisterDeviceTokenDto {#register-device-token-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:20`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `token` | `string` | No | `IsNotEmpty`, `IsString` |
| `platform` | `DevicePlatform` | No | `IsNotEmpty`, `IsEnum` |
| `deviceModel` | `string` | Yes | `IsOptional`, `IsString` |
| `appVersion` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [registerDeviceToken](./endpoints/notifications-controller.md).

## RejectDriverKycDto {#reject-driver-kyc-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:78`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [rejectDriver](./endpoints/admin-controller.md).

## RejectVendorDto {#reject-vendor-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:102`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [rejectVendor](./endpoints/admin-controller.md).

## ReopenCorporateTicketDto {#reopen-corporate-ticket-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/safety/safety.types.ts:125`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | None declared on property |

**Referenced by:** [reopen](./endpoints/corporate-support-ticket-controller.md).

## RequestOtpDto {#request-otp-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:4`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `phone` | `string` | Yes | `IsOptional`, `IsString` |
| `countryCode` | `string` | Yes | `IsOptional`, `IsString` |
| `email` | `string` | Yes | `IsOptional`, `IsEmail` |
| `channel` | `'SMS' \| 'EMAIL'` | Yes | `IsOptional`, `IsString` |
| `role` | `string` | Yes | `IsOptional`, `IsString` |
| `isRegister` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `fullName` | `string` | Yes | `IsOptional`, `IsString` |
| `companyName` | `string` | Yes | `IsOptional`, `IsString` |
| `referralCode` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [requestOtp](./endpoints/auth-controller.md).

## RequirementDetailResponseDto {#requirement-detail-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/requirement.dto.ts:150`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `remainingQuantity` | `number` | No | None declared on property |
| `offersCount` | `number` | No | None declared on property |
| `offers` | `Array<{     id: string;     requirementId: string;     driverId: string;     driverName: string;     driverPhone: string;     driverRating: number;     driverTrustScore: number;     vehicleType?: string;     vehicleModel?: string;     vehiclePlate?: string;     /** Omitted for vendors on corporate zonal trips (driver payout is internal). */     offeredRate?: number;     status: string;     createdAt: string;     expiresAt: string;     respondedAt?: string;   }>` | Yes | None declared on property |
| `searchStartedAt` | `string` | Yes | None declared on property |
| `searchEndedAt` | `string \| null` | Yes | None declared on property |
| `searchDurationMinutes` | `number` | Yes | None declared on property |
| `driversApproachedCount` | `number` | Yes | None declared on property |
| `assignedDrivers` | `Array<{     assignmentId: string;     driverId: string;     driverName: string;     driverPhone: string;     vehiclePlate?: string;     tripStatus?: string;     tripId?: string;     startOtp?: string;   }>` | Yes | None declared on property |

**Referenced by:** [getRequirementDetails](./endpoints/requirements-controller.md), [retryRequirement](./endpoints/requirements-controller.md).

## RequirementQueryDto {#requirement-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/requirement.dto.ts:128`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `page` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |
| `limit` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |
| `status` | `RequirementStatus` | Yes | `IsOptional`, `IsEnum` |
| `vehicleType` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [getRequirements](./endpoints/requirements-controller.md).

## RequirementResponseDto {#requirement-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/requirement.dto.ts:89`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `vendorId` | `string` | No | None declared on property |
| `fulfillmentMode` | `FulfillmentMode` | No | None declared on property |
| `vehicleType` | `string` | No | None declared on property |
| `quantity` | `number` | No | None declared on property |
| `assignedQuantity` | `number` | No | None declared on property |
| `pickupLocation` | `GeoLocationDto` | No | None declared on property |
| `dropLocation` | `GeoLocationDto` | No | None declared on property |
| `reportingTime` | `string` | No | None declared on property |
| `ratePerVehicle` | `number` | Yes | None declared on property |
| `suggestedBudget` | `number` | Yes | None declared on property |
| `totalAmount` | `number` | No | None declared on property |
| `status` | `RequirementStatus` | No | None declared on property |
| `notes` | `string` | Yes | None declared on property |
| `isScheduled` | `boolean` | Yes | None declared on property |
| `scheduledTriggerTime` | `string` | Yes | None declared on property |
| `hasEscort` | `boolean` | Yes | None declared on property |
| `escortFareRupees` | `number` | Yes | None declared on property |
| `pricing` | `{     planVersion: string;     distanceM: number;     vendorPricePaise: number;     driverPayoutPaise: number;     hasEscort?: boolean;     escortFarePaise?: number;     quotedAt: string;   }` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |

**Referenced by:** [createRequirement](./endpoints/requirements-controller.md), [cancelRequirement](./endpoints/requirements-controller.md).

## RescheduleRequestDto {#reschedule-request-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:53`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `employeeId` | `string` | No | None declared on property |
| `newShiftTime` | `string` | Yes | None declared on property |
| `newShiftDate` | `string` | Yes | None declared on property |
| `action` | `'CANCEL' \| 'RESCHEDULE'` | No | None declared on property |

**Referenced by:** [rescheduleOrCancel](./endpoints/corporate-trip-execution-controller.md).

## ResetPasswordDto {#reset-password-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:132`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `identifier` | `string` | No | `IsNotEmpty`, `IsString` |
| `otp` | `string` | No | `IsNotEmpty`, `IsString`, `Length` |
| `password` | `string` | No | `IsNotEmpty`, `IsString`, `Length` |

**Referenced by:** [resetPassword](./endpoints/auth-controller.md).

## ResolveDisputeDto {#resolve-dispute-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/dispute.dto.ts:28`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `DisputeStatus` | No | `IsEnum` |
| `resolutionText` | `string` | No | `IsString` |
| `refundAmount` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |

**Referenced by:** [resolveDispute](./endpoints/disputes-controller.md).

## ResolveInvoiceDisputeDto {#resolve-invoice-dispute-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/billing/corporate-billing-wire.types.ts:52`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `approvedAmountPaise` | `PaiseInput` | Yes | None declared on property |
| `note` | `string` | Yes | None declared on property |

**Referenced by:** [acceptDispute](./endpoints/corporate-billing-controller.md), [rejectDispute](./endpoints/corporate-billing-controller.md).

## ResolveSosAlertDto {#resolve-sos-alert-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-safety.dto.ts:13`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `alertId` | `string` | No | None declared on property |
| `status` | `CorporateSosStatus` | No | None declared on property |
| `resolutionNotes` | `string` | No | None declared on property |

**Referenced by:** [resolveAlert](./endpoints/corporate-safety-controller.md).

## RetirePricingPlanDto {#retire-pricing-plan-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:239`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [retirePlan](./endpoints/admin-pricing-controller.md).

## RetireRateCardDto {#retire-rate-card-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/billing/corporate-billing-wire.types.ts:34`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `effectiveTo` | `string` | Yes | None declared on property |

**Referenced by:** [retireCorporateCard](./endpoints/corporate-rate-card-controller.md), [retireDriverCard](./endpoints/corporate-rate-card-controller.md).

## ReviewQueryDto {#review-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/review.dto.ts:43`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `driverId` | `string` | Yes | `IsOptional`, `IsString` |
| `page` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |
| `limit` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |

**Referenced by:** [getDriverReviews](./endpoints/reviews-controller.md).

## ReviewResponseDto {#review-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/review.dto.ts:29`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `tripId` | `string` | No | None declared on property |
| `reviewerId` | `string` | No | None declared on property |
| `revieweeId` | `string` | No | None declared on property |
| `driverId` | `string` | Yes | None declared on property |
| `rating` | `number` | No | None declared on property |
| `feedback` | `string` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `reviewerName` | `string` | Yes | None declared on property |
| `revieweeName` | `string` | Yes | None declared on property |

**Referenced by:** [createReview](./endpoints/reviews-controller.md), [getDriverReviews](./endpoints/reviews-controller.md), [getTripReviews](./endpoints/reviews-controller.md).

## RouteOptimizationOptions {#route-optimization-options}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/routing/routing.types.ts:3`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `tenantId` | `string` | No | None declared on property |
| `officeId` | `string` | No | None declared on property |
| `shiftDate` | `string` | No | None declared on property |
| `shiftTime` | `string` | Yes | None declared on property |
| `loginTime` | `string` | Yes | None declared on property |
| `logoutTime` | `string` | Yes | None declared on property |
| `direction` | `'LOGIN' \| 'LOGOUT' \| 'BOTH'` | No | None declared on property |
| `vehicleCategory` | `VehicleCategory` | Yes | None declared on property |
| `maxCapacity` | `number` | Yes | None declared on property |
| `officeBufferMinutes` | `number` | Yes | None declared on property |
| `maxRideTimeMinutes` | `number` | Yes | None declared on property |
| `logoutReportingBufferMinutes` | `number` | Yes | None declared on property |
| `stopDwellMinutes` | `number` | Yes | None declared on property |
| `routingPreference` | `'TRAFFIC_UNAWARE' \| 'TRAFFIC_AWARE' \| 'TRAFFIC_AWARE_OPTIMAL'` | Yes | None declared on property |
| `avoidTolls` | `boolean` | Yes | None declared on property |
| `avoidHighways` | `boolean` | Yes | None declared on property |

**Referenced by:** [optimizeRoutes](./endpoints/corporate-routing-controller.md).

## RouteTelemetryDto {#route-telemetry-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:16`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `latitude` | `number` | No | None declared on property |
| `longitude` | `number` | No | None declared on property |
| `speedMps` | `number` | Yes | None declared on property |
| `headingDeg` | `number` | Yes | None declared on property |
| `accuracyM` | `number` | Yes | None declared on property |
| `batteryPct` | `number` | Yes | None declared on property |
| `recordedAt` | `string \| number` | Yes | None declared on property |

**Referenced by:** [ingestTelemetry](./endpoints/corporate-trip-execution-controller.md).

## SearchUpiVpaDto {#search-upi-vpa-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:173`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `handlePrefix` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [searchUpiVpa](./endpoints/digio-controller.md).

## SetPasswordDto {#set-password-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:148`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `password` | `string` | No | `IsNotEmpty`, `IsString`, `Length` |

**Referenced by:** [setPassword](./endpoints/auth-controller.md).

## SettlementResponseDto {#settlement-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/settlement.dto.ts:28`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `driverId` | `string` | No | None declared on property |
| `amount` | `number` | No | None declared on property |
| `status` | `SettlementStatus` | No | None declared on property |
| `bankAccountName` | `string` | Yes | None declared on property |
| `bankAccountNumber` | `string` | Yes | None declared on property |
| `bankIfsc` | `string` | Yes | None declared on property |
| `bankName` | `string` | Yes | None declared on property |
| `bankVerificationStatus` | `'NOT_SUBMITTED' \| 'PENDING' \| 'VERIFIED' \| 'REJECTED'` | Yes | None declared on property |
| `transactionRef` | `string` | Yes | None declared on property |
| `processedAt` | `string` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |

**Referenced by:** [requestWithdrawal](./endpoints/settlements-controller.md), [getSettlements](./endpoints/settlements-controller.md), [getSettlement](./endpoints/settlements-controller.md), [processSettlement](./endpoints/settlements-controller.md).

## SocialAuthDto {#social-auth-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:88`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `provider` | `'GOOGLE' \| 'APPLE'` | No | `IsNotEmpty`, `IsString` |
| `email` | `string` | No | `IsNotEmpty`, `IsEmail` |
| `idToken` | `string` | Yes | `IsOptional`, `IsString` |
| `token` | `string` | Yes | `IsOptional`, `IsString` |
| `fullName` | `string` | Yes | `IsOptional`, `IsString` |
| `photoUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `role` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [socialAuth](./endpoints/auth-controller.md).

## SosLifecycleNotesDto {#sos-lifecycle-notes-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/safety/safety.types.ts:39`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `notes` | `string` | Yes | None declared on property |
| `adminName` | `string` | Yes | None declared on property |
| `outcome` | `SosCloseOutcome` | Yes | None declared on property |

**Referenced by:** [acknowledgeAlert](./endpoints/corporate-safety-controller.md), [investigateAlert](./endpoints/corporate-safety-controller.md), [escalateAlert](./endpoints/corporate-safety-controller.md), [closeAlert](./endpoints/corporate-safety-controller.md).

## StartRouteDto {#start-route-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:34`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `driverId` | `string` | Yes | None declared on property |
| `driverLatitude` | `number` | Yes | None declared on property |
| `driverLongitude` | `number` | Yes | None declared on property |

**Referenced by:** [startRoute](./endpoints/corporate-trip-execution-controller.md).

## StartTripDto {#start-trip-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/trip.dto.ts:13`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `otp` | `string` | No | `IsNotEmpty`, `IsString`, `Length` |
| `currentLocation` | `GeoLocationDto` | No | `ValidateNested` |

**Referenced by:** [startTrip](./endpoints/trips-controller.md).

## SubmitSafeReachDto {#submit-safe-reach-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/rider/corporate-rider.types.ts:215`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `notes` | `string` | Yes | None declared on property |
| `confirmedResidenceEntry` | `boolean` | Yes | None declared on property |

**Referenced by:** [submitSafeReach](./endpoints/corporate-rider-controller.md).

## SubmitTripFeedbackDto {#submit-trip-feedback-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/rider/corporate-rider.types.ts:220`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `rating` | `number` | No | None declared on property |
| `feltSafe` | `boolean` | Yes | None declared on property |
| `tags` | `string[]` | Yes | None declared on property |
| `comment` | `string` | Yes | None declared on property |

**Referenced by:** [submitFeedback](./endpoints/corporate-rider-controller.md).

## SubscribeNewsletterDto {#subscribe-newsletter-dto}

**Use:** request body. **Source:** `apps/api/src/modules/leads/dto/create-lead.dto.ts:51`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `email` | `string` | No | `IsEmail`, `IsNotEmpty` |

**Referenced by:** [subscribeNewsletter](./endpoints/leads-controller.md).

## SuspendDriverDto {#suspend-driver-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:84`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `reason` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [suspend](./endpoints/corporate-ops-drivers-controller.md), [deactivateAccount](./endpoints/corporate-ops-drivers-controller.md), [suspendDriver](./endpoints/admin-controller.md).

## TestPushDto {#test-push-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:123`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `title` | `string` | No | `IsNotEmpty`, `IsString` |
| `body` | `string` | No | `IsNotEmpty`, `IsString` |
| `imageUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `actionUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `targetToken` | `string` | Yes | `IsOptional`, `IsString` |
| `targetUserId` | `string` | Yes | `IsOptional`, `IsString` |
| `targetPhone` | `string` | Yes | `IsOptional`, `IsString` |
| `data` | `Record<string, string>` | Yes | `IsOptional`, `IsObject` |

**Referenced by:** [sendTestPush](./endpoints/notifications-controller.md).

## ToggleFeatureFlagDto {#toggle-feature-flag-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/feature-flag.dto.ts:73`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `isEnabled` | `boolean` | No | `IsBoolean` |
| `platform` | `'android' \| 'web' \| 'all'` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [toggleFeatureFlag](./endpoints/admin-feature-flags-controller.md).

## TriggerSosAlertDto {#trigger-sos-alert-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-safety.dto.ts:3`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `routeId` | `string` | No | None declared on property |
| `stopId` | `string` | Yes | None declared on property |
| `latitude` | `number` | No | None declared on property |
| `longitude` | `number` | No | None declared on property |
| `batteryPct` | `number` | Yes | None declared on property |
| `audioUrl` | `string` | Yes | None declared on property |
| `triggerReason` | `string` | Yes | None declared on property |

**Referenced by:** [triggerSos](./endpoints/corporate-safety-controller.md).

## TripDetailResponseDto {#trip-detail-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/trip.dto.ts:122`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `distanceKm` | `number` | Yes | None declared on property |
| `durationMinutes` | `number` | Yes | None declared on property |
| `startOtp` | `string` | Yes | None declared on property |
| `events` | `TripEventResponseDto[]` | Yes | None declared on property |

**Referenced by:** [getTrip](./endpoints/trips-controller.md).

## TripEventResponseDto {#trip-event-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/trip.dto.ts:112`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `tripId` | `string` | No | None declared on property |
| `eventType` | `string` | No | None declared on property |
| `latitude` | `number` | Yes | None declared on property |
| `longitude` | `number` | Yes | None declared on property |
| `metadata` | `any` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |

**Referenced by:** [getTripEvents](./endpoints/trips-controller.md).

## TripLocationUpdateDto {#trip-location-update-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/trip.dto.ts:48`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `location` | `GeoLocationDto` | No | `ValidateNested` |
| `heading` | `number` | Yes | `IsOptional`, `IsNumber` |
| `speed` | `number` | Yes | `IsOptional`, `IsNumber` |

**Referenced by:** [updateLocation](./endpoints/trips-controller.md).

## TripQueryDto {#trip-query-dto}

**Use:** query. **Source:** `packages/contracts/src/dtos/trip.dto.ts:99`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `page` | `number` | Yes | `IsOptional` |
| `limit` | `number` | Yes | `IsOptional` |
| `status` | `TripStatus` | Yes | `IsOptional` |

**Referenced by:** [getTrips](./endpoints/trips-controller.md).

## TripResponseDto {#trip-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/trip.dto.ts:63`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `requirementId` | `string` | No | None declared on property |
| `assignmentId` | `string` | No | None declared on property |
| `vendorId` | `string` | No | None declared on property |
| `driverId` | `string` | No | None declared on property |
| `vehicleId` | `string` | Yes | None declared on property |
| `vehicleType` | `string` | No | None declared on property |
| `pickupLocation` | `GeoLocationDto` | No | None declared on property |
| `dropLocation` | `GeoLocationDto` | No | None declared on property |
| `reportingTime` | `string` | No | None declared on property |
| `startedAt` | `string` | Yes | None declared on property |
| `completedAt` | `string` | Yes | None declared on property |
| `cancelledAt` | `string` | Yes | None declared on property |
| `status` | `TripStatus` | No | None declared on property |
| `driverRate` | `number` | No | None declared on property |
| `fare` | `number` | Yes | None declared on property |
| `driverEarnings` | `number` | Yes | None declared on property |
| `tollCharges` | `number` | Yes | None declared on property |
| `parkingCharges` | `number` | Yes | None declared on property |
| `totalDriverEarnings` | `number` | No | None declared on property |
| `currentLocation` | `GeoLocationDto` | Yes | None declared on property |
| `driverName` | `string` | Yes | None declared on property |
| `driverPhone` | `string` | Yes | None declared on property |
| `vehiclePlate` | `string` | Yes | None declared on property |
| `vehicleModel` | `string` | Yes | None declared on property |
| `driver` | `any` | Yes | None declared on property |
| `vendorName` | `string` | Yes | None declared on property |
| `vendorPhone` | `string` | Yes | None declared on property |
| `vendorOrganizationName` | `string` | Yes | None declared on property |
| `requesterName` | `string` | Yes | None declared on property |
| `vendor` | `any` | Yes | None declared on property |
| `createdAt` | `string` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |

**Referenced by:** [getTrips](./endpoints/trips-controller.md), [markArrived](./endpoints/trips-controller.md), [startTrip](./endpoints/trips-controller.md), [completeTrip](./endpoints/trips-controller.md), [cancelTrip](./endpoints/trips-controller.md), [reportNoShow](./endpoints/trips-controller.md).

## UnregisterDeviceTokenDto {#unregister-device-token-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:38`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `token` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [unregisterDeviceToken](./endpoints/notifications-controller.md).

## UpdateAvailabilityDto {#update-availability-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:6`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `DriverAvailability` | No | `IsEnum` |
| `availabilityStatus` | `DriverAvailability` | Yes | `IsOptional`, `IsEnum` |
| `currentLocation` | `GeoLocationDto` | Yes | `IsOptional`, `ValidateNested` |

**Referenced by:** [updateAvailability](./endpoints/drivers-controller.md).

## UpdateBankDetailsDto {#update-bank-details-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:410`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `bankAccountName` | `string` | No | `IsString` |
| `bankAccountNumber` | `string` | No | `IsString` |
| `bankIfsc` | `string` | No | `IsString` |
| `bankName` | `string` | Yes | `IsOptional`, `IsString` |
| `upiId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [updateBankDetails](./endpoints/drivers-controller.md).

## UpdateBlogDto {#update-blog-dto}

**Use:** request body. **Source:** `apps/api/src/modules/blogs/dto/update-blog.dto.ts:4`.

No direct properties are declared on this type.

**Referenced by:** [update](./endpoints/admin-blogs-controller.md).

## UpdateCorporateEmployeeDto {#update-corporate-employee-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:153`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fullName` | `string` | Yes | None declared on property |
| `email` | `string` | Yes | None declared on property |
| `phoneNumber` | `string` | Yes | None declared on property |
| `gender` | `CorporateGender` | Yes | None declared on property |
| `officeId` | `string` | Yes | None declared on property |
| `department` | `string` | Yes | None declared on property |
| `costCenter` | `string` | Yes | None declared on property |
| `homeAddress` | `string` | Yes | None declared on property |
| `landmark` | `string` | Yes | None declared on property |
| `latitude` | `number` | Yes | None declared on property |
| `longitude` | `number` | Yes | None declared on property |
| `isActive` | `boolean` | Yes | None declared on property |

**Referenced by:** [updateEmployee](./endpoints/corporate-tenant-controller.md).

## UpdateCorporateOfficeDto {#update-corporate-office-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:121`.

No direct properties are declared on this type.

**Referenced by:** [updateOffice](./endpoints/corporate-tenant-controller.md).

## UpdateCorporateTenantDto {#update-corporate-tenant-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:79`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `CorporateTenantStatus` | Yes | None declared on property |
| `logoUrl` | `string \| null` | Yes | None declared on property |

**Referenced by:** [updateTenant](./endpoints/corporate-tenant-controller.md).

## UpdateCorporateTenantProfileDto {#update-corporate-tenant-profile-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:84`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `name` | `string` | No | None declared on property |
| `legalEntityName` | `string` | No | None declared on property |
| `gstin` | `string \| null` | Yes | None declared on property |
| `industry` | `string \| null` | Yes | None declared on property |
| `website` | `string \| null` | Yes | None declared on property |
| `logoUrl` | `string \| null` | Yes | None declared on property |
| `registeredAddress` | `string \| null` | Yes | None declared on property |
| `city` | `string \| null` | Yes | None declared on property |
| `state` | `string \| null` | Yes | None declared on property |
| `pinCode` | `string \| null` | Yes | None declared on property |
| `country` | `string \| null` | Yes | None declared on property |
| `primaryContactName` | `string \| null` | Yes | None declared on property |
| `primaryContactEmail` | `string \| null` | Yes | None declared on property |
| `primaryContactPhone` | `string \| null` | Yes | None declared on property |
| `cin` | `string \| null` | Yes | None declared on property |
| `registeredBusinessAddress` | `string \| null` | Yes | None declared on property |
| `billingAddress` | `string \| null` | Yes | None declared on property |
| `billingSameAsRegistered` | `boolean` | Yes | None declared on property |

**Referenced by:** [updateTenantProfile](./endpoints/corporate-tenant-controller.md).

## UpdateCorporateTransportZoneDto {#update-corporate-transport-zone-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/corporate/corporate-tenant.dto.ts:134`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `officeId` | `string` | Yes | None declared on property |

**Referenced by:** [updateTransportZone](./endpoints/corporate-tenant-controller.md).

## UpdateCorporateUserInput {#update-corporate-user-input}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/tenants/corporate-tenant-users.service.ts:33`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fullName` | `string` | Yes | None declared on property |
| `email` | `string` | Yes | None declared on property |
| `phone` | `string` | Yes | None declared on property |
| `corporateRole` | `CorporateRole \| string` | Yes | None declared on property |
| `officeIds` | `string[]` | Yes | None declared on property |
| `isActive` | `boolean` | Yes | None declared on property |

**Referenced by:** [updateUser](./endpoints/corporate-tenant-controller.md).

## UpdateCouponDto {#update-coupon-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:77`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `title` | `string` | Yes | `IsOptional`, `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |
| `discountType` | `CouponDiscountType` | Yes | `IsOptional`, `IsEnum` |
| `discountValue` | `number` | Yes | `IsOptional`, `IsNumber`, `Min` |
| `maxDiscountAmount` | `number` | Yes | `IsOptional`, `IsNumber` |
| `minOrderAmount` | `number` | Yes | `IsOptional`, `IsNumber` |
| `applicableTo` | `CouponApplicableContext` | Yes | `IsOptional`, `IsEnum` |
| `usageLimitTotal` | `number` | Yes | `IsOptional`, `IsNumber` |
| `usageLimitPerUser` | `number` | Yes | `IsOptional`, `IsNumber` |
| `validFrom` | `string` | Yes | `IsOptional`, `IsDateString` |
| `validUntil` | `string` | Yes | `IsOptional`, `IsDateString` |
| `isActive` | `boolean` | Yes | `IsOptional`, `IsBoolean` |

**Referenced by:** [updateCoupon](./endpoints/admin-coupons-controller.md).

## UpdateDistancePricingSlabsDto {#update-distance-pricing-slabs-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:214`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `slabs` | `CreatePricingSlabInputDto[]` | No | `IsArray`, `ValidateNested` |
| `peakWindows` | `PeakHourWindowDto[]` | Yes | `IsOptional`, `IsArray`, `ArrayMaxSize`, `ValidateNested` |
| `config` | `RateCardConfigDto \| Record<string, any>` | Yes | `IsOptional`, `IsObject` |
| `reason` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [updateSlabs](./endpoints/admin-pricing-controller.md).

## UpdateDriverProfileDto {#update-driver-profile-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:268`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `referralCode` | `string` | Yes | `IsOptional`, `IsString` |
| `fullName` | `string` | Yes | `IsOptional`, `IsString` |
| `phone` | `string` | Yes | `IsOptional`, `IsString` |
| `email` | `string` | Yes | `IsOptional`, `IsString` |
| `dateOfBirth` | `string` | Yes | `IsOptional`, `IsString` |
| `gender` | `string` | Yes | `IsOptional`, `IsString` |
| `address` | `string` | Yes | `IsOptional`, `IsString` |
| `emergencyContactName` | `string` | Yes | `IsOptional`, `IsString` |
| `emergencyContactPhone` | `string` | Yes | `IsOptional`, `IsString` |
| `profilePhotoUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleType` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleModel` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleColor` | `string` | Yes | `IsOptional`, `IsString` |
| `color` | `string` | Yes | `IsOptional`, `IsString` |
| `modelYear` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleYear` | `string` | Yes | `IsOptional`, `IsString` |
| `insurancePolicyNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `insuranceCompany` | `string` | Yes | `IsOptional`, `IsString` |
| `insuranceExpiry` | `string` | Yes | `IsOptional`, `IsString` |
| `vehiclePlate` | `string` | Yes | `IsOptional`, `IsString` |
| `vehiclePhotoUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `dlFrontUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `dlBackUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `rcDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `rcFrontUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `rcBackUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `insuranceDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `aadharFrontUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `aadharBackUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `panDocUrl` | `string` | Yes | `IsOptional`, `IsString` |
| `bankAccountName` | `string` | Yes | `IsOptional`, `IsString` |
| `bankAccountNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `bankIfsc` | `string` | Yes | `IsOptional`, `IsString` |
| `bankName` | `string` | Yes | `IsOptional`, `IsString` |
| `upiId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [updateProfile](./endpoints/drivers-controller.md).

## UpdateFeatureFlagDto {#update-feature-flag-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/feature-flag.dto.ts:48`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `name` | `string` | Yes | `IsOptional`, `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |
| `category` | `string` | Yes | `IsOptional`, `IsString` |
| `isEnabled` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `metadata` | `Record<string, any>` | Yes | `IsOptional`, `IsObject` |

**Referenced by:** [updateFeatureFlag](./endpoints/admin-feature-flags-controller.md).

## UpdateNotificationPreferenceDto {#update-notification-preference-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/notification.dto.ts:211`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `pushEnabled` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `emailEnabled` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `smsEnabled` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `tripAlerts` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `marketingPromos` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `quietHoursStart` | `string` | Yes | `IsOptional`, `IsString` |
| `quietHoursEnd` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [updatePreferences](./endpoints/notifications-controller.md).

## UpdatePolicyConfigDto {#update-policy-config-dto}

**Use:** request body. **Source:** `apps/api/src/modules/pricing/update-policy-config.dto.ts:9`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `escortFee` | `number` | Yes | `IsOptional`, `IsNumber`, `Min`, `Max` |
| `driverMonthlyFee` | `number` | Yes | `IsOptional`, `IsNumber`, `Min`, `Max` |
| `driverTrialDays` | `number` | Yes | `IsOptional`, `IsInt`, `Min`, `Max` |
| `minWithdrawalAmount` | `number` | Yes | `IsOptional`, `IsNumber`, `Min`, `Max` |

**Referenced by:** [updatePolicyConfig](./endpoints/pricing-controller.md).

## UpdateSupportTicketStatusDto {#update-support-ticket-status-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/safety/safety.types.ts:84`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `status` | `CorporateTicketStatus` | No | None declared on property |
| `notes` | `string` | Yes | None declared on property |

**Referenced by:** [updateStatus](./endpoints/corporate-support-ticket-controller.md), [status](./endpoints/ops-support-ticket-controller.md).

## UpdateUserDto {#update-user-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:192`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fullName` | `string` | Yes | `IsOptional`, `IsString` |
| `email` | `string` | Yes | `IsOptional`, `IsString` |
| `phone` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [updateProfile](./endpoints/auth-controller.md).

## UpdateVehicleCategoryDto {#update-vehicle-category-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:443`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `categoryLabel` | `string` | Yes | `IsOptional`, `IsString` |
| `seatingCapacity` | `string` | Yes | `IsOptional`, `IsString` |
| `description` | `string` | Yes | `IsOptional`, `IsString` |
| `iconKey` | `string` | Yes | `IsOptional`, `IsString` |
| `isActive` | `boolean` | Yes | `IsOptional`, `IsBoolean` |

**Referenced by:** [updatePricingTier](./endpoints/pricing-controller.md).

## UploadDocumentDto {#upload-document-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:429`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `filename` | `string` | Yes | `IsOptional`, `IsString` |
| `mimeType` | `string` | Yes | `IsOptional`, `IsString` |
| `contentBase64` | `string` | Yes | `IsOptional`, `IsString` |
| `documentType` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [uploadDocument](./endpoints/drivers-controller.md).

## UploadDocumentResponseDto {#upload-document-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/driver.dto.ts:447`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `url` | `string` | No | None declared on property |
| `filename` | `string` | No | None declared on property |
| `size` | `number` | No | None declared on property |
| `checksum` | `string` | No | None declared on property |
| `documentType` | `string` | Yes | None declared on property |

**Referenced by:** [uploadDocument](./endpoints/drivers-controller.md).

## ValidateCouponDto {#validate-coupon-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/coupon.dto.ts:133`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `code` | `string` | No | `IsNotEmpty`, `IsString` |
| `amount` | `number` | No | `IsNumber`, `Min` |
| `context` | `CouponApplicableContext` | Yes | `IsOptional`, `IsEnum` |

**Referenced by:** [validateCoupon](./endpoints/coupons-controller.md).

## ValidateReferralDto {#validate-referral-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/driver.dto.ts:491`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `identifier` | `string` | No | `IsString` |

**Referenced by:** [validateReferrer](./endpoints/referrals-controller.md).

## ValidateReferralResponseDto

**Use:** response. **Source:** `packages/contracts/src/dtos/driver.dto.ts:496`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `valid` | `boolean` | No | None declared on property |
| `message` | `string` | No | None declared on property |
| `referrer` | `{     id: string;     fullName: string;     phoneMasked?: string;     vehicleType?: string;   }` | Yes | None declared on property |

**Referenced by:** [validateReferrer](./endpoints/referrals-controller.md).

## VehicleCategoryDto {#vehicle-category-dto}

**Use:** response. **Source:** `apps/api/src/modules/pricing/pricing.service.ts:11`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `id` | `string` | No | None declared on property |
| `vehicleType` | `string` | No | None declared on property |
| `categoryLabel` | `string` | No | None declared on property |
| `seatingCapacity` | `string` | No | None declared on property |
| `maxSeats` | `number` | No | None declared on property |
| `description` | `string` | No | None declared on property |
| `iconKey` | `string \| null` | Yes | None declared on property |
| `isActive` | `boolean` | No | None declared on property |
| `updatedAt` | `string` | No | None declared on property |
| `updatedBy` | `string \| null` | Yes | None declared on property |

**Referenced by:** [getAllPricing](./endpoints/pricing-controller.md), [getPricingTiers](./endpoints/pricing-controller.md), [createPricingTier](./endpoints/pricing-controller.md), [getPricingTier](./endpoints/pricing-controller.md), [updatePricingTier](./endpoints/pricing-controller.md).

## VendorConfirmTripDto {#vendor-confirm-trip-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:367`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `quoteId` | `string` | No | `IsNotEmpty`, `IsUUID` |
| `quantity` | `number` | Yes | `IsOptional`, `IsInt`, `Min` |
| `reportingTime` | `string` | Yes | `IsOptional`, `IsDateString` |
| `notes` | `string` | Yes | `IsOptional`, `IsString` |
| `idempotencyKey` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [confirmTrip](./endpoints/vendor-quote-controller.md).

## VendorTripQuoteRequestDto {#vendor-trip-quote-request-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:310`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `pickup` | `GeoPointDto` | Yes | `IsOptional`, `ValidateNested` |
| `drop` | `GeoPointDto` | Yes | `IsOptional`, `ValidateNested` |
| `pickupLocation` | `GeoPointDto` | Yes | `IsOptional`, `ValidateNested` |
| `dropLocation` | `GeoPointDto` | Yes | `IsOptional`, `ValidateNested` |
| `vehicleCategory` | `string` | Yes | `IsOptional`, `IsString` |
| `hasEscort` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `pickupTime` | `string` | Yes | `IsOptional`, `IsISO8601` |

**Referenced by:** [createQuote](./endpoints/vendor-quote-controller.md).

## VendorTripQuoteResponseDto {#vendor-trip-quote-response-dto}

**Use:** response. **Source:** `packages/contracts/src/dtos/distance-pricing.dto.ts:345`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `quoteId` | `string` | No | None declared on property |
| `routeDistanceM` | `number` | No | None declared on property |
| `displayedKm` | `number` | No | None declared on property |
| `vendorPricePaise` | `number` | No | None declared on property |
| `vendorPriceRupees` | `number` | No | None declared on property |
| `baseVendorPricePaise` | `number` | Yes | None declared on property |
| `baseVendorPriceRupees` | `number` | Yes | None declared on property |
| `hasEscort` | `boolean` | Yes | None declared on property |
| `escortFarePaise` | `number` | Yes | None declared on property |
| `escortFareRupees` | `number` | Yes | None declared on property |
| `planVersion` | `string` | No | None declared on property |
| `routeSummary` | `string` | Yes | None declared on property |
| `expiresAt` | `string` | No | None declared on property |
| `pickupAddress` | `string` | Yes | None declared on property |
| `dropAddress` | `string` | Yes | None declared on property |
| `canAutoQuote` | `boolean` | No | None declared on property |
| `errorMessage` | `string` | Yes | None declared on property |
| `isPeak` | `boolean` | Yes | None declared on property |
| `activeWindowLabel` | `string` | Yes | None declared on property |

**Referenced by:** [createQuote](./endpoints/vendor-quote-controller.md).

## VerifyBankAccountDto {#verify-bank-account-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:133`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `accountNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `ifsc` | `string` | No | `IsNotEmpty`, `IsString` |
| `accountHolderName` | `string` | Yes | `IsOptional`, `IsString` |
| `validationMode` | `DigioBankValidationMode` | Yes | `IsOptional`, `IsIn` |
| `saveToDriverProfile` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyBankAccount](./endpoints/digio-controller.md).

## VerifyCinDto {#verify-cin-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:207`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `cin` | `string` | No | `IsNotEmpty`, `IsString` |
| `targetVendorId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyCin](./endpoints/digio-controller.md).

## VerifyDinDto {#verify-din-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:217`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `din` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [verifyDin](./endpoints/digio-controller.md).

## VerifyDriverKycDto {#verify-driver-kyc-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:63`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `notes` | `string` | Yes | `IsOptional`, `IsString` |
| `overrideReason` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyDriver](./endpoints/admin-controller.md).

## VerifyDrivingLicenseDto {#verify-driving-license-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:53`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `dlNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `dob` | `string` | No | `IsNotEmpty`, `IsString` |
| `name` | `string` | Yes | `IsOptional`, `IsString` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyDl](./endpoints/digio-controller.md).

## VerifyFssaiDto {#verify-fssai-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:233`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fssaiNumber` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [verifyFssai](./endpoints/digio-controller.md).

## VerifyGstDto {#verify-gst-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:179`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `gstin` | `string` | No | `IsNotEmpty`, `IsString` |
| `advanced` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `saveToVendorProfile` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `targetVendorId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyGst](./endpoints/digio-controller.md).

## VerifyIfscDto {#verify-ifsc-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:127`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `ifsc` | `string` | No | `IsNotEmpty`, `IsString` |

**Referenced by:** [verifyIfsc](./endpoints/digio-controller.md).

## VerifyKraPanDto {#verify-kra-pan-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:109`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `panNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `dob` | `string` | Yes | `IsOptional`, `IsString` |
| `fetchType` | `'I' \| 'E' \| 'B'` | Yes | `IsOptional`, `IsIn` |
| `mobile` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyKraPan](./endpoints/digio-controller.md).

## VerifyOtpDto {#verify-otp-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/auth.dto.ts:49`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `requestId` | `string` | Yes | `IsOptional`, `IsString` |
| `phone` | `string` | Yes | `IsOptional`, `IsString` |
| `countryCode` | `string` | Yes | `IsOptional`, `IsString` |
| `email` | `string` | Yes | `IsOptional`, `IsEmail` |
| `otp` | `string` | No | `IsNotEmpty`, `IsString`, `Length` |
| `role` | `string` | Yes | `IsOptional`, `IsString` |
| `isRegister` | `boolean` | Yes | `IsOptional`, `IsBoolean` |
| `fullName` | `string` | Yes | `IsOptional`, `IsString` |
| `referralCode` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyOtp](./endpoints/auth-controller.md).

## VerifyPanDto {#verify-pan-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:31`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `panNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `name` | `string` | Yes | `IsOptional`, `IsString` |
| `dob` | `string` | Yes | `IsOptional`, `IsString` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |
| `targetVendorId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyPan](./endpoints/digio-controller.md).

## VerifyPanToGstDto {#verify-pan-to-gst-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:197`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `panNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `listingType` | `'LIST_ONLY' \| 'BASIC'` | Yes | `IsOptional`, `IsIn` |

**Referenced by:** [verifyPanToGst](./endpoints/digio-controller.md).

## VerifyPassportDto {#verify-passport-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:85`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `fileNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `dob` | `string` | No | `IsNotEmpty`, `IsString` |
| `name` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyPassport](./endpoints/digio-controller.md).

## VerifyStopOtpDto {#verify-stop-otp-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:6`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `otpCode` | `string` | No | None declared on property |

**Referenced by:** [verifyOtp](./endpoints/corporate-trip-execution-controller.md).

## VerifyStopQrDto {#verify-stop-qr-dto}

**Use:** request body. **Source:** `apps/api/src/domains/corporate/execution/trip-execution.types.ts:10`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `qrPayload` | `string` | No | None declared on property |
| `driverLatitude` | `number` | No | None declared on property |
| `driverLongitude` | `number` | No | None declared on property |

**Referenced by:** [verifyQr](./endpoints/corporate-trip-execution-controller.md).

## VerifyUanDto {#verify-uan-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:264`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `type` | `'UAN' \| 'MOBILE'` | No | `IsNotEmpty`, `IsIn` |
| `identifier` | `string` | No | `IsNotEmpty`, `IsString` |
| `includeHistory` | `boolean` | Yes | `IsOptional`, `IsBoolean` |

**Referenced by:** [verifyUan](./endpoints/digio-controller.md).

## VerifyUdyamDto {#verify-udyam-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:223`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `udyamNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `targetVendorId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyUdyam](./endpoints/digio-controller.md).

## VerifyUpiVpaDto {#verify-upi-vpa-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:159`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `vpa` | `string` | No | `IsNotEmpty`, `IsString` |
| `name` | `string` | Yes | `IsOptional`, `IsString` |
| `saveToDriverProfile` | `boolean` | Yes | `IsOptional`, `IsBoolean` |

**Referenced by:** [verifyUpiVpa](./endpoints/digio-controller.md).

## VerifyVehicleInsuranceDto {#verify-vehicle-insurance-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:470`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `policyNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `registrationNumber` | `string` | Yes | `IsOptional`, `IsString` |
| `insurerName` | `string` | Yes | `IsOptional`, `IsString` |
| `expiryDate` | `string` | Yes | `IsOptional`, `IsString` |
| `vehicleId` | `string` | Yes | `IsOptional`, `IsString` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyVehicleInsurance](./endpoints/digio-controller.md).

## VerifyVehicleRcDto {#verify-vehicle-rc-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:71`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `registrationNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `vehicleId` | `string` | Yes | `IsOptional`, `IsString` |
| `targetDriverId` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyVehicleRc](./endpoints/digio-controller.md).

## VerifyVendorDto {#verify-vendor-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/admin.dto.ts:96`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `notes` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyVendor](./endpoints/admin-controller.md).

## VerifyVoterIdDto {#verify-voter-id-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/digio.dto.ts:99`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `voterId` | `string` | No | `IsNotEmpty`, `IsString` |
| `name` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [verifyVoterId](./endpoints/digio-controller.md).

## WithdrawalRequestDto {#withdrawal-request-dto}

**Use:** request body. **Source:** `packages/contracts/src/dtos/settlement.dto.ts:5`.

| Field | Type | TypeScript optional? | Runtime validators |
|---|---|---|---|
| `amount` | `number` | No | `IsNumber`, `Min` |
| `bankAccountName` | `string` | No | `IsNotEmpty`, `IsString` |
| `bankAccountNumber` | `string` | No | `IsNotEmpty`, `IsString` |
| `bankIfsc` | `string` | No | `IsNotEmpty`, `IsString` |
| `bankName` | `string` | Yes | `IsOptional`, `IsString` |

**Referenced by:** [requestWithdrawal](./endpoints/settlements-controller.md).

## Untyped request parameters

Some endpoints declare request bodies as `any` or inline object types. Their route pages show the exact signature; those inputs do not have a shared DTO contract to list here. Treat these as documentation gaps, not evidence that arbitrary payloads are valid.

## Sources and verification

- `packages/contracts/src/dtos/**/*.ts` — shared DTO declarations and validator decorators.
- `apps/api/src/domains/corporate/**/*.ts` — Corporate request/response wire types.
- `apps/api/src/main.ts` — global runtime validation configuration.
