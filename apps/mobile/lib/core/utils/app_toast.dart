import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../theme/app_colors.dart';
import '../networking/api_client.dart';

/// Centralized notification & alert manager for both Mobile and Web platforms.
/// Solves Fluttertoast Web styling issues (default green gradients) by explicitly configuring `webBgColor`.
/// Automatically formats and extracts user-friendly error messages from ApiExceptions.
class AppToast {
  AppToast._();

  /// Extracts a clean, human-readable message from exceptions or raw objects.
  static String cleanErrorMessage(dynamic error) {
    if (error == null) return 'An unexpected error occurred. Please try again.';

    String raw;
    if (error is ApiException) {
      final code = error.statusCode;
      final msg = error.message.trim();
      final lower = msg.toLowerCase();

      // Check for user existence errors
      if (lower.contains('user does not exist') ||
          lower.contains('account not found') ||
          lower.contains('user not found') ||
          lower.contains('no account found')) {
        return 'No account found with this email or mobile number. Please check your details or sign up.';
      }

      // Check for password errors
      if (lower.contains('incorrect password') ||
          lower.contains('invalid password') ||
          lower.contains('wrong password')) {
        return 'Incorrect password. Please try again or reset your password.';
      }

      // Check for generic invalid credentials
      if (lower.contains('invalid mobile number/email or password') ||
          lower.contains('invalid credentials')) {
        return 'Invalid email/phone or password. Please verify your details.';
      }

      // Check for missing password setup
      if (lower.contains('no password set')) {
        return 'No password has been set for this account. Please sign in with OTP or click "Forgot Password".';
      }

      // Check for OTP errors
      if (lower.contains('invalid otp') || lower.contains('invalid or expired otp')) {
        return 'Invalid or expired OTP code. Please enter the correct code or request a new one.';
      }

      // Check for rate limit
      if (code == 429 || lower.contains('too many requests')) {
        return 'Too many attempts. Please wait a moment before trying again.';
      }

      if (code == 404) {
        return 'The requested account or resource was not found.';
      }

      if (code >= 500) {
        return 'Server temporarily unavailable. Please try again shortly.';
      }

      raw = msg;
    } else {
      raw = error.toString().trim();
    }

    // Strip technical exception prefixes
    raw = raw.replaceAll(RegExp(r'^(Api)?Exception(\(\d+\))?:\s*', caseSensitive: false), '');
    raw = raw.replaceAll(RegExp(r'^(Client|BadRequest|Unauthorized|NotFound|Forbidden)Exception:\s*', caseSensitive: false), '');
    raw = raw.replaceAll(RegExp(r'^Error:\s*', caseSensitive: false), '');
    raw = raw.trim();

    // Check for common network/connectivity issues
    final lowerRaw = raw.toLowerCase();
    if (lowerRaw.contains('socketexception') ||
        lowerRaw.contains('failed host lookup') ||
        lowerRaw.contains('network is unreachable') ||
        lowerRaw.contains('connection refused') ||
        lowerRaw.contains('clientexception') ||
        lowerRaw.contains('xmlhttprequest error')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (raw.isEmpty) {
      return 'An unexpected error occurred. Please try again.';
    }

    return raw;
  }

  /// Displays a vibrant RED alert for errors or invalid field validations.
  static void showError(dynamic error, {BuildContext? context}) {
    final message = cleanErrorMessage(error);

    // If context is mounted, also display in-app Material SnackBar for superior UX
    if (context != null && context.mounted) {
      try {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              duration: const Duration(seconds: 4),
            ),
          );
          return;
        }
      } catch (_) {}
    }

    // Native toast with explicit webBgColor red gradient to override Fluttertoast Web's default green style
    Fluttertoast.showToast(
      msg: message,
      toastLength: Toast.LENGTH_LONG,
      gravity: ToastGravity.BOTTOM,
      backgroundColor: AppColors.error,
      textColor: Colors.white,
      fontSize: 14.0,
      webBgColor: 'linear-gradient(to right, #dc2626, #b91c1c)',
      webPosition: 'right',
      timeInSecForIosWeb: 4,
    );
  }

  /// Displays a vibrant GREEN notification for success operations.
  static void showSuccess(String message, {BuildContext? context}) {
    if (context != null && context.mounted) {
      try {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.accentGreenDark,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              duration: const Duration(seconds: 3),
            ),
          );
          return;
        }
      } catch (_) {}
    }

    Fluttertoast.showToast(
      msg: message,
      toastLength: Toast.LENGTH_SHORT,
      gravity: ToastGravity.BOTTOM,
      backgroundColor: AppColors.accentGreenDark,
      textColor: Colors.white,
      fontSize: 14.0,
      webBgColor: 'linear-gradient(to right, #16a34a, #15803d)',
      webPosition: 'right',
      timeInSecForIosWeb: 3,
    );
  }

  /// Displays an AMBER notification for warnings.
  static void showWarning(String message, {BuildContext? context}) {
    if (context != null && context.mounted) {
      try {
        final messenger = ScaffoldMessenger.maybeOf(context);
        if (messenger != null) {
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.warning,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              duration: const Duration(seconds: 3),
            ),
          );
          return;
        }
      } catch (_) {}
    }

    Fluttertoast.showToast(
      msg: message,
      toastLength: Toast.LENGTH_LONG,
      gravity: ToastGravity.BOTTOM,
      backgroundColor: AppColors.warning,
      textColor: Colors.white,
      fontSize: 14.0,
      webBgColor: 'linear-gradient(to right, #d97706, #b45309)',
      webPosition: 'right',
      timeInSecForIosWeb: 3,
    );
  }

  /// Displays a BLUE notification for info.
  static void showInfo(String message, {BuildContext? context}) {
    Fluttertoast.showToast(
      msg: message,
      toastLength: Toast.LENGTH_SHORT,
      gravity: ToastGravity.BOTTOM,
      backgroundColor: AppColors.primary,
      textColor: Colors.white,
      fontSize: 14.0,
      webBgColor: 'linear-gradient(to right, #4f46e5, #4338ca)',
      webPosition: 'right',
      timeInSecForIosWeb: 3,
    );
  }
}
