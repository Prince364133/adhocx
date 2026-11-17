import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:adhocx_employee/features/boarding/completion/driver_safety_rating_sheet.dart';
import 'package:adhocx_employee/features/trips/summary/driver_rating_trip.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';

class DriverRatingPromptService {
  DriverRatingPromptService._();

  static const _promptedTripsKey = 'employee_driver_rating_prompted_trip_ids';

  static Future<DriverRatingTrip?> checkAndPrompt(
    BuildContext context, {
    Map<String, dynamic>? tripData,
  }) async {
    final suppliedStatus = tripData?['routeStatus']?.toString().toUpperCase();
    if (suppliedStatus == 'CANCELLED' || suppliedStatus == 'CANCELED') {
      return null;
    }

    final expectedStopId = tripData?['stopId']?.toString();
    final hasExpectedStopId =
        expectedStopId != null && expectedStopId.trim().isNotEmpty;
    if (suppliedStatus != null &&
        suppliedStatus.isNotEmpty &&
        suppliedStatus != 'COMPLETED' &&
        !hasExpectedStopId) {
      return null;
    }

    final repository = context.read<HttpEmployeeRiderRepository>();
    final attempts = hasExpectedStopId ? 5 : 1;
    for (var attempt = 0; attempt < attempts; attempt++) {
      final trips = await repository.getTripsHistory(limit: 100);
      final parsedTrips = trips
          .map(DriverRatingTrip.tryParse)
          .whereType<DriverRatingTrip>()
          .toList();
      final matchingTrips = hasExpectedStopId
          ? parsedTrips.where((trip) => trip.stopId == expectedStopId).toList()
          : parsedTrips;
      final trip = matchingTrips.isEmpty ? null : matchingTrips.first;

      if (trip != null && trip.isCompleted) {
        if (!trip.canRate) return trip;

        final preferences = await SharedPreferences.getInstance();
        final promptedTrips =
            preferences.getStringList(_promptedTripsKey) ?? const <String>[];
        if (promptedTrips.contains(trip.stopId)) return trip;

        final saved = await preferences.setStringList(
          _promptedTripsKey,
          [...promptedTrips, trip.stopId],
        );
        if (!saved) {
          throw StateError('Unable to save the trip rating prompt state');
        }

        if (!context.mounted) return trip;
        final submitted = await showDriverSafetyRatingSheet(context, trip);
        if (submitted == true && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content:
                  Text('Thank you! Your driver rating has been submitted.'),
            ),
          );
        }
        return trip;
      }

      if (!hasExpectedStopId || attempt == attempts - 1) return null;
      await Future<void>.delayed(const Duration(seconds: 1));
    }

    return null;
  }
}
