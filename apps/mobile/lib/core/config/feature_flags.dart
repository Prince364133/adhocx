import 'package:flutter/foundation.dart';
import '../networking/api_client.dart';

/// Central feature toggles for staged rollouts and role-scoped visibility.
class FeatureFlags {
  FeatureFlags._();

  /// Shown to Vendors when booking hits wallet/payment enforcement while
  /// Vendor Wallet UI is hidden and online payment gateway integration is pending.
  static const String vendorPaymentGatewayPendingMessage =
      'Waiting for payment gateway API';

  /// Temporarily hides Wallet / Payments UI and routes from Vendor (User)
  /// access while keeping Driver Earnings / Wallet intact.
  static bool _vendorWalletEnabled = false;

  static bool get isVendorWalletEnabled => _vendorWalletEnabled;

  /// Matches Vendor-specific backend wallet/escrow balance error messages so
  /// global formatters can replace them without altering Driver wallet alerts.
  static bool isVendorSpecificWalletErrorMessage(String message) {
    final lower = message.toLowerCase();
    return lower.contains('insufficient adhocx wallet') ||
        lower.contains('top up your wallet before posting requirements') ||
        lower.contains('top up your wallet and try again');
  }

  /// Extracts a lowercase-inspectable string and checks whether a Vendor
  /// requirement booking error was caused by wallet balance / top-up gating.
  static bool isVendorRequirementWalletError(Object? error) {
    if (error == null) return false;
    final message = error is ApiException ? error.message : error.toString();
    final lower = message.toLowerCase();
    if (isVendorSpecificWalletErrorMessage(lower)) return true;
    return lower.contains('insufficient') ||
        lower.contains('wallet') ||
        lower.contains('balance');
  }

  @visibleForTesting
  static void setVendorWalletEnabledForTesting(bool enabled) {
    _vendorWalletEnabled = enabled;
  }
}

