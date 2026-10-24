import 'dart:convert';
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
    int? statusCode;
    if (error is ApiException) {
      statusCode = error.statusCode;
      raw = error.message.trim();
    } else {
      raw = error.toString().trim();
    }

    // Try parsing raw string as JSON if it looks like a serialized JSON error
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          if (decoded['message'] != null) {
            final m = decoded['message'];
            raw = (m is List ? m.join('. ') : m.toString()).trim();
          } else if (decoded['error'] != null) {
            final err = decoded['error'];
            if (err is Map && err['message'] != null) {
              raw = err['message'].toString().trim();
            } else if (err is String) {
              raw = err.trim();
            }
          }
        }
      } catch (_) {}
    }

    // Repeatedly strip all technical prefixes and wrappers anywhere in the message
    bool changed = true;
    while (changed) {
      final prev = raw;
      // Strip technical exception class prefixes (e.g. ApiException(400):, Exception:, ClientException:, etc.)
      raw = raw.replaceAll(RegExp(r'(Api|Client|BadRequest|Unauthorized|NotFound|Forbidden|InternalServerError|Conflict|Socket|Timeout|Http|Platform|Format|Type|State)?Exception(\(\d+\))?:\s*', caseSensitive: false), '');
      raw = raw.replaceAll(RegExp(r'(TypeError|NoSuchMethodError|StateError|AssertionError):\s*', caseSensitive: false), '');
      // Strip action prefixes like "Withdrawal: ", "Arrival check: ", "Error starting trip: "
      raw = raw.replaceAll(RegExp(r'^(Withdrawal|Arrival check|Error starting trip|Error completing trip|Failed to [a-zA-Z0-9_\s]+|Notice|Alert|Error):\s*', caseSensitive: false), '');
      raw = raw.replaceAll(RegExp(r'^Error:\s*', caseSensitive: false), '');
      raw = raw.replaceAll(RegExp(r'\[\d{3}\]\s*', caseSensitive: false), '');
      raw = raw.replaceAll(RegExp(r'\(status\s*\d{3}\)\s*', caseSensitive: false), '');
      raw = raw.trim();
      changed = (raw != prev);
    }

    final lower = raw.toLowerCase();

    // 1. Balance and wallet issues
    if (lower.contains('insufficient balance')) {
      return raw.isNotEmpty ? raw : 'Insufficient wallet balance for this withdrawal.';
    }

    // 2. User existence errors
    if (lower.contains('user does not exist') ||
        lower.contains('account not found') ||
        lower.contains('user not found') ||
        lower.contains('no account found')) {
      return 'No account found with this email or mobile number. Please check your details or sign up.';
    }

    // 3. Password errors
    if (lower.contains('incorrect password') ||
        lower.contains('invalid password') ||
        lower.contains('wrong password')) {
      return 'Incorrect password. Please try again or reset your password.';
    }

    // 4. Generic invalid credentials
    if (lower.contains('invalid mobile number/email or password') ||
        lower.contains('invalid credentials')) {
      return 'Invalid email/phone or password. Please verify your details.';
    }

    // 5. Missing password setup
    if (lower.contains('no password set')) {
      return 'No password has been set for this account. Please sign in with OTP or click "Forgot Password".';
    }

    // 6. OTP errors
    if (lower.contains('invalid otp') || lower.contains('invalid or expired otp')) {
      return 'Invalid or expired OTP code. Please enter the correct code or request a new one.';
    }

    // 7. Rate limit
    if (statusCode == 429 || lower.contains('too many requests')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }

    // 8. Unique conflict or duplicate
    if (lower.contains('already in use') ||
        lower.contains('already exists') ||
        lower.contains('unique constraint') ||
        lower.contains('violates unique')) {
      return raw.isNotEmpty ? raw : 'This information is already linked to another account.';
    }

    // 9. Common network/connectivity issues
    if (lower.contains('socketexception') ||
        lower.contains('failed host lookup') ||
        lower.contains('network is unreachable') ||
        lower.contains('connection refused') ||
        lower.contains('clientexception') ||
        lower.contains('timed out') ||
        lower.contains('timeoutexception') ||
        lower.contains('xmlhttprequest error') ||
        lower.contains('connection closed')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    // 10. Database / Server / Internal errors / Technical code dumps
    if ((statusCode != null && statusCode >= 500) ||
        lower.contains('internal server error') ||
        lower.contains('prismaclient') ||
        lower.contains('prisma') ||
        lower.contains('database') ||
        lower.contains('sqlstate') ||
        lower.contains('syntax error') ||
        lower.contains('unhandled exception') ||
        lower.contains('nullcheckoperator') ||
        lower.contains('stack trace') ||
        lower.contains('nosuchmethod') ||
        lower.contains('request failed with status')) {
      return 'Something went wrong. Please try again shortly.';
    }

    if (statusCode == 404 || lower.contains('not found')) {
      return raw.isNotEmpty ? raw : 'The requested resource was not found.';
    }

    if (raw.isEmpty) {
      return 'Unable to complete your request. Please check your details and try again.';
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
