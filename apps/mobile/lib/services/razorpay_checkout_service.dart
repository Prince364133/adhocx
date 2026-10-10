import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:universal_html/html.dart' as html;
import './global_dispatch_overlay_service.dart';

class RazorpayPaymentResult {
  final bool success;
  final String? paymentId;
  final String? orderId;
  final String? signature;
  final String? errorMessage;
  final int? errorCode;

  RazorpayPaymentResult({
    required this.success,
    this.paymentId,
    this.orderId,
    this.signature,
    this.errorMessage,
    this.errorCode,
  });

  /// Returns true if the checkout was voluntarily cancelled or dismissed by the user
  bool get isCancelled {
    if (errorCode == Razorpay.PAYMENT_CANCELLED || errorCode == 0) return true;
    final msg = (errorMessage ?? '').trim().toLowerCase();
    if (msg == 'undefined' || msg == 'null') return true;
    return msg.contains('cancel') ||
        msg.contains('dismiss') ||
        msg.contains('closed by user') ||
        msg.contains('back');
  }
}

class RazorpayCheckoutService {
  RazorpayCheckoutService._();
  static final RazorpayCheckoutService instance = RazorpayCheckoutService._();

  /// Sanitizes raw error messages and error codes from Razorpay gateways across Web/Android/iOS
  /// ensuring user-cancelled checkouts or missing/undefined payloads never leak 'undefined' to UI.
  static String sanitizeErrorMessage(String? raw, int? code) {
    if (code == Razorpay.PAYMENT_CANCELLED || code == 0) {
      return 'Payment cancelled by user';
    }
    if (raw == null) {
      return 'Payment was cancelled or failed';
    }
    var msg = raw.trim();
    if (msg.isEmpty || msg.toLowerCase() == 'undefined' || msg.toLowerCase() == 'null') {
      if (code == Razorpay.PAYMENT_CANCELLED || code == 0) {
        return 'Payment cancelled by user';
      }
      return 'Payment was cancelled or failed';
    }

    // Parse potential JSON error payloads from Razorpay bridge: e.g. {"error": {"description": "..."}}
    if (msg.startsWith('{') && msg.endsWith('}')) {
      try {
        final decoded = jsonDecode(msg);
        if (decoded is Map) {
          final errorObj = decoded['error'];
          if (errorObj is Map) {
            final desc = errorObj['description']?.toString().trim();
            final reason = errorObj['reason']?.toString().trim();
            final codeVal = errorObj['code']?.toString().trim();
            if (desc != null && desc.isNotEmpty && desc.toLowerCase() != 'undefined' && desc.toLowerCase() != 'null') {
              msg = desc;
            } else if (reason != null && reason.isNotEmpty && reason.toLowerCase() != 'undefined' && reason.toLowerCase() != 'null') {
              msg = reason;
            } else if (codeVal != null && codeVal.isNotEmpty && codeVal.toLowerCase() != 'undefined' && codeVal.toLowerCase() != 'null') {
              msg = codeVal;
            }
          }
        }
      } catch (_) {}
    }

    if (msg.toLowerCase() == 'undefined' || msg.toLowerCase() == 'null' || msg.isEmpty) {
      return (code == Razorpay.PAYMENT_CANCELLED || code == 0)
          ? 'Payment cancelled by user'
          : 'Payment was cancelled or failed';
    }

    if (msg.toLowerCase().contains('cancel') ||
        msg.toLowerCase().contains('dismiss') ||
        msg.toLowerCase().contains('closed by user')) {
      return 'Payment cancelled by user';
    }

    return msg;
  }

  /// Initiates live Razorpay checkout dialog across Web, Android, and iOS
  Future<RazorpayPaymentResult> openCheckout({
    required String keyId,
    required String orderId,
    required double amount, // in INR (e.g. 500.0)
    required String name,
    required String description,
    String? prefillContact,
    String? prefillEmail,
    Map<String, dynamic>? notes,
  }) async {
    GlobalDispatchOverlayService.instance.pauseForPaymentFlow();

    // ── 1. Web Platform Implementation ──────────────────────────────────────
    if (kIsWeb) {
      final completer = Completer<RazorpayPaymentResult>();
      completer.future.whenComplete(() {
        GlobalDispatchOverlayService.instance.resumeAfterPaymentFlow();
      });
      final token = 'rzp_tok_${DateTime.now().millisecondsSinceEpoch}_${orderId.hashCode.abs()}';
      StreamSubscription? messageSubscription;

      messageSubscription = html.window.onMessage.listen((event) {
        final dynamic data = event.data;
        if (data is Map) {
          final msgToken = data['token']?.toString();
          if (msgToken != null && msgToken != token) return; // ignore unrelated messages

          final type = data['type']?.toString();
          if (type == 'RAZORPAY_PAYMENT_SUCCESS') {
            if (!completer.isCompleted) {
              completer.complete(
                RazorpayPaymentResult(
                  success: true,
                  paymentId: data['paymentId']?.toString(),
                  orderId: data['orderId']?.toString() ?? orderId,
                  signature: data['signature']?.toString(),
                ),
              );
            }
            messageSubscription?.cancel();
          } else if (type == 'RAZORPAY_PAYMENT_FAILURE') {
            final rawMsg = data['errorMessage']?.toString();
            final rawCode = data['errorCode'] is num ? (data['errorCode'] as num).toInt() : null;
            final sanitizedMsg = sanitizeErrorMessage(rawMsg, rawCode);
            if (!completer.isCompleted) {
              completer.complete(
                RazorpayPaymentResult(
                  success: false,
                  errorCode: rawCode,
                  errorMessage: sanitizedMsg,
                ),
              );
            }
            messageSubscription?.cancel();
          }
        }
      });

      // Dispatch checkout event to browser window
      html.window.postMessage(
        {
          'type': 'OPEN_RAZORPAY_CHECKOUT',
          'config': {
            'token': token,
            'key': keyId,
            'amount': (amount * 100).round(), // in paise
            'currency': 'INR',
            'name': name,
            'order_id': orderId,
            'description': description,
            'prefill': {
              if (prefillContact != null && prefillContact.isNotEmpty) 'contact': prefillContact,
              if (prefillEmail != null && prefillEmail.isNotEmpty) 'email': prefillEmail,
            },
            if (notes != null) 'notes': notes,
            'theme': {'color': '#5B42F3'},
          },
        },
        '*',
      );

      return completer.future;
    }

    // ── 2. Native Mobile (Android & iOS) Implementation ─────────────────────

    final completer = Completer<RazorpayPaymentResult>();
    completer.future.whenComplete(() {
      GlobalDispatchOverlayService.instance.resumeAfterPaymentFlow();
    });
    final razorpay = Razorpay();

    void handlePaymentSuccess(PaymentSuccessResponse response) {
      if (!completer.isCompleted) {
        completer.complete(
          RazorpayPaymentResult(
            success: true,
            paymentId: response.paymentId,
            orderId: response.orderId ?? orderId,
            signature: response.signature,
          ),
        );
      }
      try {
        razorpay.clear();
      } catch (_) {}
    }

    void handlePaymentError(PaymentFailureResponse response) {
      final sanitizedMsg = sanitizeErrorMessage(response.message, response.code);
      if (!completer.isCompleted) {
        completer.complete(
          RazorpayPaymentResult(
            success: false,
            errorCode: response.code,
            errorMessage: sanitizedMsg,
          ),
        );
      }
      try {
        razorpay.clear();
      } catch (_) {}
    }

    void handleExternalWallet(ExternalWalletResponse response) {
      if (!completer.isCompleted) {
        completer.complete(
          RazorpayPaymentResult(
            success: false,
            errorMessage: 'External wallet selected: ${response.walletName}',
          ),
        );
      }
      try {
        razorpay.clear();
      } catch (_) {}
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, handlePaymentSuccess);
    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, handlePaymentError);
    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, handleExternalWallet);

    final options = {
      'key': keyId,
      'amount': (amount * 100).round(), // amount in paise
      'name': name,
      'order_id': orderId,
      'description': description,
      'timeout': 300,
      'prefill': {
        if (prefillContact != null && prefillContact.isNotEmpty) 'contact': prefillContact,
        if (prefillEmail != null && prefillEmail.isNotEmpty) 'email': prefillEmail,
      },
      if (notes != null) 'notes': notes,
      'theme': {
        'color': '#5B42F3',
      },
    };

    try {
      razorpay.open(options);
    } catch (e) {
      try {
        razorpay.clear();
      } catch (_) {}
      if (!completer.isCompleted) {
        completer.complete(
          RazorpayPaymentResult(
            success: false,
            errorMessage: 'Could not open Razorpay checkout: ${e.toString()}',
          ),
        );
      }
    }

    return completer.future;
  }
}
