import 'package:flutter/material.dart';
import '../../core/networking/api_client.dart';
import '../../services/user_service.dart';
import 'trip_rating_bottom_sheet.dart';

/// Customer-side enforcement of the mandatory post-trip review.
///
/// The server is the source of truth (booking returns 403 MANDATORY_REVIEW_PENDING); this gate
/// surfaces the owed review proactively (dashboard, booking screens, app resume) and chains
/// through every pending trip (multi-cab bookings) until none remain.
class PendingReviewGate {
  PendingReviewGate._();

  static const String errorCode = 'MANDATORY_REVIEW_PENDING';
  static bool _showing = false;

  /// Fetch the oldest owed review and present it. [onCleared] runs only after the customer
  /// has cleared at least one owed review and nothing further is owed.
  static Future<void> check(BuildContext context, {VoidCallback? onCleared}) =>
      _check(context, onCleared, resolvedAny: false);

  static Future<void> _check(BuildContext context, VoidCallback? onCleared, {required bool resolvedAny}) async {
    if (_showing) return;
    final trip = await UserService.instance.getPendingReview();
    if (trip == null) {
      if (resolvedAny) onCleared?.call();
      return;
    }
    if (!context.mounted) return;
    await showFor(context, trip, onCleared: onCleared);
  }

  /// Present the locked rating sheet for [trip]; after a successful submit, re-check for more.
  static Future<void> showFor(
    BuildContext context,
    Map<String, dynamic> trip, {
    VoidCallback? onCleared,
  }) async {
    final tripId = trip['id']?.toString() ?? trip['tripId']?.toString() ?? '';
    if (_showing || tripId.isEmpty) return;
    _showing = true;
    var resolved = false;
    try {
      await TripRatingBottomSheet.show(
        context: context,
        tripId: tripId,
        targetName: trip['driverName']?.toString() ?? 'Your Driver',
        vehicleInfo: trip['vehiclePlate']?.toString(),
        isReviewingDriver: true,
        isMandatory: true,
        onReviewSubmitted: () => resolved = true,
      );
    } finally {
      _showing = false;
    }
    if (resolved && context.mounted) {
      await _check(context, onCleared, resolvedAny: true);
    }
  }

  /// True when [error] is the server's review gate; also opens the owed review.
  /// Use in any booking flow's catch block before showing a generic error.
  static bool handleBookingError(BuildContext context, Object error, {VoidCallback? onCleared}) {
    if (error is! ApiException || error.statusCode != 403) return false;
    final body = error.data;
    final err = body is Map ? body['error'] : null;
    if (err is! Map || err['code'] != errorCode) return false;
    final details = err['details'] is Map ? Map<String, dynamic>.from(err['details'] as Map) : <String, dynamic>{};
    showFor(context, details, onCleared: onCleared);
    return true;
  }
}
