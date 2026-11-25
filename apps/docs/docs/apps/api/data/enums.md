---
title: Prisma Enums
description: Enum values declared in the AdhocX Prisma schema and the model fields that use them.
status: source-verified
last_reviewed: "2026-11-23"
---

# Prisma Enums

The current Prisma DMMF contains **42 enums**. Values below are source declarations, not API validation guarantees; endpoints may apply additional rules.

## UserRole {#user-role}

| Value |
|---|
| `VENDOR` |
| `DRIVER` |
| `ADMIN` |
| `OPS` |
| `CORPORATE_ADMIN` |
| `CORPORATE_MANAGER` |
| `EMPLOYEE` |

**Used by:** [User.role](./dictionary/identity-and-supply.md#user)

## UserStatus {#user-status}

| Value |
|---|
| `ACTIVE` |
| `SUSPENDED` |
| `DEACTIVATED` |

**Used by:** [User.status](./dictionary/identity-and-supply.md#user)

## VerificationStatus {#verification-status}

| Value |
|---|
| `PENDING` |
| `UNDER_REVIEW` |
| `VERIFIED` |
| `REJECTED` |
| `SUSPENDED` |

**Used by:** [Vendor.verificationStatus](./dictionary/identity-and-supply.md#vendor), [Driver.verificationStatus](./dictionary/identity-and-supply.md#driver), [Vehicle.verificationStatus](./dictionary/identity-and-supply.md#vehicle)

## DriverAvailability {#driver-availability}

| Value |
|---|
| `OFFLINE` |
| `AVAILABLE` |
| `BUSY` |
| `UNAVAILABLE` |

**Used by:** [Driver.availabilityStatus](./dictionary/identity-and-supply.md#driver)

## FulfillmentMode {#fulfillment-mode}

| Value |
|---|
| `DIRECT_DISPATCH` |

**Used by:** [Requirement.fulfillmentMode](./dictionary/marketplace-and-trips.md#requirement)

## DisputeStatus {#dispute-status}

| Value |
|---|
| `OPEN` |
| `UNDER_REVIEW` |
| `RESOLVED` |
| `REJECTED` |

**Used by:** [Dispute.status](./dictionary/marketplace-and-trips.md#dispute)

## RequirementStatus {#requirement-status}

| Value |
|---|
| `DRAFT` |
| `POSTED` |
| `DISPATCHING` |
| `PARTIALLY_FULFILLED` |
| `FULFILLED` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |
| `NO_DRIVER_AVAILABLE` |

**Used by:** [Requirement.status](./dictionary/marketplace-and-trips.md#requirement)

## OfferStatus {#offer-status}

| Value |
|---|
| `CREATED` |
| `SENT` |
| `ACCEPTED` |
| `DECLINED` |
| `EXPIRED` |
| `CANCELLED` |

**Used by:** [Offer.status](./dictionary/marketplace-and-trips.md#offer)

## AssignmentStatus {#assignment-status}

| Value |
|---|
| `PENDING` |
| `CONFIRMED` |
| `CANCELLED` |
| `COMPLETED` |

**Used by:** [Assignment.status](./dictionary/marketplace-and-trips.md#assignment)

## TripStatus {#trip-status}

| Value |
|---|
| `ASSIGNED` |
| `ARRIVED` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |
| `NO_SHOW` |

**Used by:** [Trip.status](./dictionary/marketplace-and-trips.md#trip)

## PaymentStatus {#payment-status}

| Value |
|---|
| `PENDING` |
| `AUTHORIZED` |
| `CAPTURED` |
| `FAILED` |
| `REFUNDED` |

**Used by:** [Payment.status](./dictionary/payments-and-promotions.md#payment)

## SettlementStatus {#settlement-status}

| Value |
|---|
| `PENDING` |
| `PROCESSING` |
| `SETTLED` |
| `FAILED` |
| `CANCELLED` |

**Used by:** [Settlement.status](./dictionary/payments-and-promotions.md#settlement)

## LedgerEntryType {#ledger-entry-type}

| Value |
|---|
| `CREDIT` |
| `DEBIT` |

**Used by:** [LedgerEntry.entryType](./dictionary/payments-and-promotions.md#ledger-entry)

## CouponDiscountType {#coupon-discount-type}

| Value |
|---|
| `PERCENTAGE` |
| `FLAT` |

**Used by:** [Coupon.discountType](./dictionary/payments-and-promotions.md#coupon)

## CouponApplicableContext {#coupon-applicable-context}

| Value |
|---|
| `WALLET_TOPUP` |
| `REQUIREMENT_BOOKING` |
| `ALL` |

**Used by:** [Coupon.applicableTo](./dictionary/payments-and-promotions.md#coupon)

## DriverSubscriptionStatus {#driver-subscription-status}

| Value |
|---|
| `TRIAL_ACTIVE` |
| `ACTIVE` |
| `GRACE_PERIOD` |
| `EXPIRED` |
| `FROZEN` |

**Used by:** [Driver.subscriptionStatus](./dictionary/identity-and-supply.md#driver)

## ReferralStatus {#referral-status}

| Value |
|---|
| `PENDING_VERIFICATION` |
| `UNLOCKED_READY_TO_CLAIM` |
| `CLAIMED` |
| `REVOKED` |

**Used by:** [DriverReferral.status](./dictionary/identity-and-supply.md#driver-referral)

## BlogStatus {#blog-status}

| Value |
|---|
| `DRAFT` |
| `PUBLISHED` |
| `ARCHIVED` |

**Used by:** [BlogPost.status](./dictionary/platform-and-communications.md#blog-post)

## DevicePlatform {#device-platform}

| Value |
|---|
| `ANDROID` |
| `IOS` |
| `WEB` |

**Used by:** [DeviceToken.platform](./dictionary/platform-and-communications.md#device-token)

## NotificationType {#notification-type}

| Value |
|---|
| `SYSTEM` |
| `TRIP_OFFER` |
| `TRIP_ASSIGNED` |
| `TRIP_STATUS` |
| `REQUIREMENT_UPDATE` |
| `KYC_UPDATE` |
| `WALLET_UPDATE` |
| `MARKETING_PROMO` |
| `BROADCAST` |

**Used by:** [Notification.type](./dictionary/platform-and-communications.md#notification)

## RateCardAudience {#rate-card-audience}

| Value |
|---|
| `VENDOR` |
| `DRIVER` |

**Used by:** [RateCardVersion.audience](./dictionary/pricing-and-locality.md#rate-card-version)

## RateCardStatus {#rate-card-status}

| Value |
|---|
| `DRAFT` |
| `ACTIVE` |
| `RETIRED` |

**Used by:** [RateCardVersion.status](./dictionary/pricing-and-locality.md#rate-card-version)

## LocalityReviewStatus {#locality-review-status}

| Value |
|---|
| `VERIFIED` |
| `PENDING_REVIEW` |
| `INACTIVE` |

**Used by:** [LocalityMaster.reviewStatus](./dictionary/pricing-and-locality.md#locality-master)

## CorporateTenantStatus {#corporate-tenant-status}

| Value |
|---|
| `ACTIVE` |
| `SUSPENDED` |
| `TERMINATED` |

**Used by:** [CorporateTenant.status](./dictionary/corporate-tenancy-and-organization.md#corporate-tenant)

## CorporateGender {#corporate-gender}

| Value |
|---|
| `MALE` |
| `FEMALE` |
| `OTHER` |

**Used by:** [CorporateEmployee.gender](./dictionary/corporate-tenancy-and-organization.md#corporate-employee)

## CorporateRosterStatus {#corporate-roster-status}

| Value |
|---|
| `DRAFT` |
| `APPROVED` |
| `PUBLISHED` |
| `PROCESSED` |
| `CANCELLED` |

**Used by:** [CorporateRoster.status](./dictionary/corporate-rosters-and-scheduling.md#corporate-roster)

## CorporateTransportDirection {#corporate-transport-direction}

| Value |
|---|
| `LOGIN` |
| `LOGOUT` |

**Used by:** [CorporateRoster.direction](./dictionary/corporate-rosters-and-scheduling.md#corporate-roster), [CorporateTransportRequest.direction](./dictionary/corporate-rosters-and-scheduling.md#corporate-transport-request), [CorporateRoute.direction](./dictionary/corporate-routing-execution-and-safety.md#corporate-route), [CorporateRosterEntry.direction](./dictionary/corporate-rosters-and-scheduling.md#corporate-roster-entry)

## CorporateRequestStatus {#corporate-request-status}

| Value |
|---|
| `APPROVED` |
| `PLANNED` |
| `ASSIGNED` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |
| `RESCHEDULED` |
| `UNSERVED` |

**Used by:** [CorporateTransportRequest.status](./dictionary/corporate-rosters-and-scheduling.md#corporate-transport-request)

## CorporateRouteStatus {#corporate-route-status}

| Value |
|---|
| `PLANNED` |
| `DISPATCHING` |
| `ASSIGNED` |
| `IN_TRANSIT` |
| `COMPLETED` |
| `CANCELLED` |

**Used by:** [CorporateRoute.status](./dictionary/corporate-routing-execution-and-safety.md#corporate-route)

## CorporateStopStatus {#corporate-stop-status}

| Value |
|---|
| `PENDING` |
| `ARRIVED` |
| `BOARDED` |
| `NO_SHOW` |
| `CANCELLED` |

**Used by:** [CorporateRouteStop.status](./dictionary/corporate-routing-execution-and-safety.md#corporate-route-stop)

## CorporateInvoiceStatus {#corporate-invoice-status}

| Value |
|---|
| `DRAFT` |
| `ISSUED` |
| `PAID` |
| `DISPUTED` |

**Used by:** [CorporateInvoice.status](./dictionary/corporate-billing-and-payouts.md#corporate-invoice)

## CorporateDriverEarningStatus {#corporate-driver-earning-status}

| Value |
|---|
| `UNPAID` |
| `PROCESSING` |
| `PAID` |
| `VOIDED` |

**Used by:** [CorporateDriverEarning.payoutStatus](./dictionary/corporate-billing-and-payouts.md#corporate-driver-earning)

## CorporateSosStatus {#corporate-sos-status}

| Value |
|---|
| `NEW` |
| `ACTIVE` |
| `ACKNOWLEDGED` |
| `INVESTIGATING` |
| `ESCALATED` |
| `RESPONDED` |
| `RESOLVED` |
| `FALSE_ALARM` |

**Used by:** [CorporateSosAlert.status](./dictionary/corporate-routing-execution-and-safety.md#corporate-sos-alert)

## CorporateTicketCategory {#corporate-ticket-category}

| Value |
|---|
| `TECHNICAL_ISSUE` |
| `EMPLOYEE_MANAGEMENT` |
| `ROUTE_MANAGEMENT` |
| `TRANSPORT_OPERATIONS` |
| `BILLING_PAYMENTS` |
| `ACCOUNT_ACCESS` |
| `GENERAL_SUPPORT` |
| `CAB_DELAY` |
| `DRIVER_BEHAVIOR` |
| `ROUTE_ISSUE` |
| `BILLING` |
| `LOST_ITEM` |
| `VEHICLE_CONDITION` |
| `SAFETY_CONCERN` |
| `OTHER` |

**Used by:** [CorporateSupportTicket.category](./dictionary/corporate-support.md#corporate-support-ticket)

## CorporateTicketPriority {#corporate-ticket-priority}

| Value |
|---|
| `LOW` |
| `MEDIUM` |
| `HIGH` |
| `CRITICAL` |

**Used by:** [CorporateSupportTicket.priority](./dictionary/corporate-support.md#corporate-support-ticket)

## CorporateTicketStatus {#corporate-ticket-status}

| Value |
|---|
| `OPEN` |
| `ASSIGNED` |
| `IN_PROGRESS` |
| `WAITING_FOR_CORPORATE` |
| `RESOLVED` |
| `CLOSED` |
| `REOPENED` |

**Used by:** [CorporateSupportTicket.status](./dictionary/corporate-support.md#corporate-support-ticket)

## CorporateTicketCommentVisibility {#corporate-ticket-comment-visibility}

| Value |
|---|
| `PUBLIC` |
| `INTERNAL` |

**Used by:** [CorporateSupportTicketComment.visibility](./dictionary/corporate-support.md#corporate-support-ticket-comment), [CorporateSupportTicketActivity.visibility](./dictionary/corporate-support.md#corporate-support-ticket-activity)

## CorporatePayoutBatchStatus {#corporate-payout-batch-status}

| Value |
|---|
| `DRAFT` |
| `SUBMITTED` |
| `APPROVED` |
| `PROCESSING` |
| `PAID` |
| `FAILED` |

**Used by:** [CorporatePayoutBatch.status](./dictionary/corporate-billing-and-payouts.md#corporate-payout-batch)

## CorporatePayoutStatus {#corporate-payout-status}

| Value |
|---|
| `PENDING` |
| `PROCESSING` |
| `PAID` |
| `FAILED` |
| `REVERSED` |

**Used by:** [CorporatePayout.status](./dictionary/corporate-billing-and-payouts.md#corporate-payout)

## CorporateInvoiceDisputeStatus {#corporate-invoice-dispute-status}

| Value |
|---|
| `OPEN` |
| `ACCEPTED` |
| `REJECTED` |

**Used by:** [CorporateInvoiceDispute.status](./dictionary/corporate-billing-and-payouts.md#corporate-invoice-dispute)

## CorporateDriverOfferStatus {#corporate-driver-offer-status}

| Value |
|---|
| `SENT` |
| `ACCEPTED` |
| `REJECTED` |
| `EXPIRED` |
| `WITHDRAWN` |

**Used by:** [CorporateDriverOffer.status](./dictionary/corporate-routing-execution-and-safety.md#corporate-driver-offer)

## CorporateUserRole {#corporate-user-role}

| Value |
|---|
| `CORP_SUPER_ADMIN` |
| `HR` |
| `TRANSPORT` |
| `FINANCE` |
| `SAFETY` |
| `READ_ONLY` |

**Used by:** [User.corporateRole](./dictionary/identity-and-supply.md#user)
