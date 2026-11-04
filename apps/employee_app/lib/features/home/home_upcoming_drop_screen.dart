import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';

/// Screen: Upcoming Drop (Home Dashboard - Logout Shift)
/// Uses design system components: EmployeeGreetingHeader, EmployeeHeroTripCard,
/// EmployeeDriverCard, EmployeePrimaryButton, EmployeeSecondaryButton, EmployeeBottomNavBar.
class HomeUpcomingDropScreen extends StatefulWidget {
  const HomeUpcomingDropScreen({super.key});

  @override
  State<HomeUpcomingDropScreen> createState() => _HomeUpcomingDropScreenState();
}

class _HomeUpcomingDropScreenState extends State<HomeUpcomingDropScreen> {
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    final trip = await MockDataService.getTrip('upcoming_drop');
    if (mounted) {
      setState(() {
        _profile = profile;
        _trip = trip;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final name = _profile?['name'] ?? 'Ravi Kumar';
    final tripType = _trip?['type'] ?? 'Office Drop (Logout)';
    final date = _trip?['date'] ?? 'Today, 09 Dec 2026';
    final time = _trip?['time'] ?? '6:30 PM';
    final driver = _trip?['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] ?? 'Suresh R';
    final vehicleNumber = driver?['vehicleNumber'] ?? 'TS09UB7845';
    final vehicleModel = driver?['vehicleModel'] ?? 'Swift Dzire (White)';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Greeting + Notification Bell with Unread Badge
              EmployeeGreetingHeader(
                name: name,
                greeting: 'Good Afternoon,',
                unreadNotificationsCount: 1,
                onNotificationTap: () => context.push(AppRoutes.notificationsCenter),
                onProfileTap: () => context.push(AppRoutes.profileDetails),
              ),

              const SizedBox(height: 24),

              // Flagship Hero Trip Card (Drop)
              EmployeeHeroTripCard(
                title: tripType,
                date: date,
                time: time,
                isDrop: true,
                badgeText: 'Next Trip',
                driverName: driverName,
                vehicleNumber: vehicleNumber,
                primaryActionLabel: 'Track Cab',
                onPrimaryAction: () => context.push(AppRoutes.tripAssigned),
                secondaryActionLabel: 'Details',
                onSecondaryAction: () => context.push(AppRoutes.tripDetails),
              ),

              const SizedBox(height: 18),

              // Cab Assigned Driver Card
              EmployeeDriverCard(
                name: driverName,
                vehicleNumber: vehicleNumber,
                vehicleModel: vehicleModel,
                rating: 4.8,
                experience: '6+ yrs',
                onCall: () => context.push(AppRoutes.contactDriverSheet),
                onChat: () => context.push(AppRoutes.contactDriverSheet),
                onViewDetails: () => context.push(AppRoutes.driverDetails),
              ),

              const SizedBox(height: 20),

              // Primary Action: Track Trip
              EmployeePrimaryButton(
                label: 'Track Trip',
                icon: Icons.navigation_rounded,
                onPressed: () => context.push(AppRoutes.tripAssigned),
              ),

              const SizedBox(height: 14),

              // Action buttons: Request Change & Cancel Trip
              Row(
                children: [
                  Expanded(
                    child: EmployeeSecondaryButton(
                      label: 'Request Change',
                      icon: Icons.edit_calendar_rounded,
                      onPressed: () => context.push(AppRoutes.tripPlanning),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: EmployeeSecondaryButton(
                      label: 'Cancel Trip',
                      icon: Icons.cancel_outlined,
                      textColor: AppColors.error,
                      borderColor: AppColors.errorBorder,
                      onPressed: () => context.push(AppRoutes.tripCancelled),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: 0,
        onTap: (index) {
          if (index == 1) context.go(AppRoutes.scheduleToday);
          if (index == 2) context.go(AppRoutes.historyOverview);
          if (index == 3) context.go(AppRoutes.safetyOverview);
          if (index == 4) context.go(AppRoutes.profileDetails);
        },
      ),
    );
  }
}

