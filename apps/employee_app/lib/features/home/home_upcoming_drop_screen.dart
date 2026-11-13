import 'package:flutter/material.dart';
import 'widgets/home_upcoming_trip_view.dart';

/// Screen: Upcoming Drop (Home Dashboard - Logout Shift).
class HomeUpcomingDropScreen extends StatelessWidget {
  const HomeUpcomingDropScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const HomeUpcomingTripView(
      tripKey: 'upcoming_drop',
      isDrop: true,
      greeting: 'Good Afternoon,',
      fallbackTitle: 'Office Drop (Logout)',
      fallbackTime: '6:30 PM',
    );
  }
}
