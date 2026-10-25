/// Utility functions for checking and sanitizing names across the app
/// to prevent generic placeholder strings ('Driver', 'User', 'Vendor', etc.)
/// from being prefilled or sent to backend APIs.
library;

bool isPlaceholderName(String? name) {
  if (name == null) return true;
  final n = name.trim().toLowerCase();
  return n.isEmpty ||
      n == 'driver' ||
      n == 'driver partner' ||
      n == 'driver applicant' ||
      n == 'assigned driver' ||
      n == 'your driver' ||
      n == 'user' ||
      n == 'vendor' ||
      n == 'vendor partner' ||
      n == 'google user' ||
      n == 'google partner' ||
      n == 'apple user' ||
      n == 'requester' ||
      n == 'partner' ||
      n == 'partner name' ||
      n == 'corporate partner' ||
      n == 'corporate booker' ||
      n == 'adhocx partner' ||
      n == 'test driver';
}

String sanitizeRealName(String? name) {
  if (isPlaceholderName(name)) return '';
  return name!.trim();
}
