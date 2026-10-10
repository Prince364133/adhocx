import 'package:flutter_test/flutter_test.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:adhocx/services/razorpay_checkout_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('RazorpayCheckoutService Sanitization & Cancellation Tests', () {
    test('sanitizeErrorMessage handles Razorpay.PAYMENT_CANCELLED (code 0)', () {
      final res = RazorpayCheckoutService.sanitizeErrorMessage('undefined', Razorpay.PAYMENT_CANCELLED);
      expect(res, 'Payment cancelled by user');
    });

    test('sanitizeErrorMessage never returns literal undefined or null string', () {
      expect(
        RazorpayCheckoutService.sanitizeErrorMessage('undefined', null),
        'Payment was cancelled or failed',
      );
      expect(
        RazorpayCheckoutService.sanitizeErrorMessage('null', null),
        'Payment was cancelled or failed',
      );
      expect(
        RazorpayCheckoutService.sanitizeErrorMessage(null, null),
        'Payment was cancelled or failed',
      );
      expect(
        RazorpayCheckoutService.sanitizeErrorMessage('', null),
        'Payment was cancelled or failed',
      );
    });

    test('sanitizeErrorMessage parses Razorpay JSON payload correctly', () {
      final jsonMsg = '{"error": {"description": "Payment cancelled by user", "code": "BAD_REQUEST_ERROR"}}';
      final res = RazorpayCheckoutService.sanitizeErrorMessage(jsonMsg, null);
      expect(res, 'Payment cancelled by user');
    });

    test('sanitizeErrorMessage protects against JSON error with undefined description', () {
      final jsonMsg = '{"error": {"description": "undefined", "code": "BAD_REQUEST_ERROR"}}';
      final res = RazorpayCheckoutService.sanitizeErrorMessage(jsonMsg, 0);
      expect(res, 'Payment cancelled by user');
    });

    test('sanitizeErrorMessage preserves genuine gateway failure messages', () {
      final res = RazorpayCheckoutService.sanitizeErrorMessage('Insufficient funds in account', 1);
      expect(res, 'Insufficient funds in account');
    });

    test('RazorpayPaymentResult.isCancelled detects cancellation accurately', () {
      final cancelledWithCode = RazorpayPaymentResult(
        success: false,
        errorCode: Razorpay.PAYMENT_CANCELLED,
        errorMessage: 'undefined',
      );
      expect(cancelledWithCode.isCancelled, true);

      final cancelledWithMessage = RazorpayPaymentResult(
        success: false,
        errorMessage: 'Payment cancelled by user',
      );
      expect(cancelledWithMessage.isCancelled, true);

      final cancelledWithUndefined = RazorpayPaymentResult(
        success: false,
        errorMessage: 'undefined',
      );
      expect(cancelledWithUndefined.isCancelled, true);

      final failedPayment = RazorpayPaymentResult(
        success: false,
        errorCode: 1,
        errorMessage: 'Card declined by issuing bank',
      );
      expect(failedPayment.isCancelled, false);
    });
  });
}
