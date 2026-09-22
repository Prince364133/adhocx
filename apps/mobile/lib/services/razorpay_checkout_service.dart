import 'dart:async';
import 'package:razorpay_flutter/razorpay_flutter.dart';

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
}

class RazorpayCheckoutService {
  RazorpayCheckoutService._();
  static final RazorpayCheckoutService instance = RazorpayCheckoutService._();

  /// Initiates live Razorpay checkout dialog
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
    final completer = Completer<RazorpayPaymentResult>();
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
      if (!completer.isCompleted) {
        completer.complete(
          RazorpayPaymentResult(
            success: false,
            errorCode: response.code,
            errorMessage: response.message ?? 'Payment was cancelled or failed',
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
