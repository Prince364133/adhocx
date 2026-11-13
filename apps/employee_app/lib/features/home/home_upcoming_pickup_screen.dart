import 'package:flutter/material.dart';
import 'widgets/home_upcoming_trip_view.dart';

/// Screen: Upcoming Pickup (Home Dashboard - Login Shift).
class HomeUpcomingPickupScreen extends StatelessWidget {
  const HomeUpcomingPickupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const HomeUpcomingTripView(
      tripKey: 'upcoming_pickup',
      isDrop: false,
      greeting: 'Good Morning,',
      fallbackTitle: 'Office Pickup (Login)',
      fallbackTime: '8:15 AM',
    );
  }
}
