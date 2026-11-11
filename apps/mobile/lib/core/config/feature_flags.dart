import 'package:flutter/foundation.dart';

/// Central feature toggles for staged rollouts and role-scoped visibility.
class FeatureFlags {
  FeatureFlags._();

  /// Temporarily hides Wallet / Payments UI and routes from Vendor (User)
  /// access while keeping Driver Earnings / Wallet intact.
  static bool _vendorWalletEnabled = false;

  static bool get isVendorWalletEnabled => _vendorWalletEnabled;

  @visibleForTesting
  static void setVendorWalletEnabledForTesting(bool enabled) {
    _vendorWalletEnabled = enabled;
  }
}

