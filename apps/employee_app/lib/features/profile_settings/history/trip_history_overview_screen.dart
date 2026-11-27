import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/features/trips/summary/driver_rating_trip.dart';
import 'package:adhocx_employee/repositories/http_employee_rider_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/employee_api_client.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Trips tab: completed trip history grouped by month.
class TripHistoryOverviewScreen extends StatefulWidget {
  const TripHistoryOverviewScreen({super.key});

  @override
  State<TripHistoryOverviewScreen> createState() =>
      _TripHistoryOverviewScreenState();
}

class _TripHistoryOverviewScreenState extends State<TripHistoryOverviewScreen> {
  static const _tabs = ['All', 'Pickup', 'Drop'];
  int _selectedTab = 0;
  bool _futureInitialized = false;
  late Future<List<DriverRatingTrip>> _tripsFuture;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_futureInitialized) {
      _futureInitialized = true;
      _tripsFuture = _loadTrips();
    }
  }

  Future<List<DriverRatingTrip>> _loadTrips() async {
    final rawTrips = await context
        .read<HttpEmployeeRiderRepository>()
        .getTripsHistory(limit: 100);
    return rawTrips
        .map(DriverRatingTrip.tryParse)
        .whereType<DriverRatingTrip>()
        .toList();
  }

  void _reloadTrips() {
    setState(() => _tripsFuture = _loadTrips());
  }

  bool _matches(DriverRatingTrip trip) {
    switch (_selectedTab) {
      case 1:
        return !trip.isDrop;
      case 2:
        return trip.isDrop;
      default:
        return true;
    }
  }

  bool _isThisMonth(DriverRatingTrip trip) {
    final tripDate = DateTime.tryParse(trip.shiftDate);
    final now = DateTime.now();
    return tripDate != null &&
        tripDate.year == now.year &&
        tripDate.month == now.month;
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return FutureBuilder<List<DriverRatingTrip>>(
      future: _tripsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const EmployeeLoadingScaffold(
            skeletonLayout: SkeletonLayout.list,
          );
        }

        if (snapshot.hasError) {
          final error = snapshot.error;
          final requiresSignIn = error is ApiException &&
              (error.statusCode == 401 || error.statusCode == 403);
          return Scaffold(
            backgroundColor: p.background,
            appBar: EmployeeAppBar(
              title: 'Trip History',
              onBack: () => context.go(AppRoutes.homeUpcomingPickup),
            ),
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.pageHorizontal),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.cloud_off_rounded,
                          size: 40, color: p.textMuted),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        requiresSignIn
                            ? 'Sign in with an employee account to view trip history.'
                            : 'Unable to load trip history.',
                        style: AppTypography.body(color: p.textSecondary),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      EmployeePrimaryButton(
                        label: requiresSignIn ? 'Sign In' : 'Retry',
                        onPressed: requiresSignIn
                            ? () => context.go(AppRoutes.mobileNumber)
                            : _reloadTrips,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 2),
          );
        }

        final trips = (snapshot.data ?? const <DriverRatingTrip>[])
            .where(_matches)
            .toList();
        final thisMonth = trips.where(_isThisMonth).toList();
        final earlierTrips =
            trips.where((trip) => !_isThisMonth(trip)).toList();

        Widget section(String title, List<DriverRatingTrip> sectionTrips) =>
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  title,
                  style: AppTypography.small(
                    color: p.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                for (final trip in sectionTrips)
                  EmployeeTripCard(
                    title: trip.title,
                    date: trip.displayDate,
                    time: trip.shiftTime,
                    status: trip.displayStatus,
                    isDrop: trip.isDrop,
                    route: '${trip.pickupAddress} → ${trip.destinationAddress}',
                    trailing: trip.canRate
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded,
                                  color: AppColors.starAmber, size: 17),
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                'Rate',
                                style: AppTypography.caption(
                                  color: p.accent,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          )
                        : null,
                    onTap: () => context.push(
                      AppRoutes.tripHistoryDetails,
                      extra: trip.toJson(),
                    ),
                  ),
                const SizedBox(height: AppSpacing.lg),
              ],
            );

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: 'Trip History',
            onBack: () => context.go(AppRoutes.homeUpcomingPickup),
            actions: [
              IconButton(
                tooltip: 'Trip analytics',
                icon: Icon(Icons.bar_chart_rounded, color: p.accent),
                onPressed: () => context.push(AppRoutes.tripSummaryAnalytics),
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                EmployeePillFilter(
                  options: _tabs,
                  selectedIndex: _selectedTab,
                  onSelected: (index) => setState(() => _selectedTab = index),
                ),
                Expanded(
                  child: trips.isEmpty
                      ? const EmployeeEmptyState(
                          icon: Icons.history_rounded,
                          title: 'No Trip History',
                          description:
                              'No commute trips are available in this period.',
                        )
                      : ListView(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.pageHorizontal,
                            vertical: AppSpacing.lg,
                          ),
                          children: [
                            if (thisMonth.isNotEmpty)
                              section('This Month', thisMonth),
                            if (earlierTrips.isNotEmpty)
                              section('Earlier Trips', earlierTrips),
                          ],
                        ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 2),
        );
      },
    );
  }
}
