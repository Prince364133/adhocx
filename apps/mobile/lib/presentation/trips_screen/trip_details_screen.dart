import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 3: Trip Details with live backend integration and full lifecycle support.
class TripDetailsScreen extends StatefulWidget {
  final dynamic initialTrip;
  const TripDetailsScreen({super.key, this.initialTrip});

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  dynamic _trip;
  bool _isLoading = false;
  bool _isActionInProgress = false;

  @override
  void initState() {
    super.initState();
    _trip = widget.initialTrip;
    _fetchTripDetails();
  }

  Future<void> _fetchTripDetails() async {
    String? tripId;
    if (_trip is Map && _trip['id'] != null) {
      tripId = _trip['id'].toString();
    } else if (widget.initialTrip is String) {
      tripId = widget.initialTrip as String;
    }

    if (tripId == null) {
      // Find the first active or upcoming trip from DriverService
      try {
        final trips = await DriverService.instance.getTrips();
        if (trips.isNotEmpty && mounted) {
          setState(() => _trip = trips.first);
        }
      } catch (_) {}
      return;
    }

    try {
      final updated = await DriverService.instance.getTrip(tripId);
      if (updated != null && mounted) {
        setState(() => _trip = updated);
      }
    } catch (_) {}
  }

  void _callPassenger(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      Fluttertoast.showToast(msg: 'Calling $phone...');
    }
  }

  void _openChat(String name) {
    Fluttertoast.showToast(
      msg: 'Chat with $name opened',
      backgroundColor: AppColors.primaryDark,
    );
  }

  void _openNavigation() {
    Fluttertoast.showToast(
      msg: 'Opening GPS Navigation...',
      backgroundColor: AppColors.primaryDark,
    );
  }

  Future<void> _handleMarkArrived(String tripId) async {
    setState(() => _isActionInProgress = true);
    try {
      await DriverService.instance.markArrived(tripId);
      Fluttertoast.showToast(
        msg: 'Marked arrived at pickup location!',
        backgroundColor: AppColors.accentGreenDark,
      );
      await _fetchTripDetails();
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Arrival check: ${e.toString().replaceAll('Exception: ', '')}',
        backgroundColor: AppColors.error,
      );
    } finally {
      if (mounted) setState(() => _isActionInProgress = false);
    }
  }

  Future<void> _handleStartTrip(String tripId) async {
    final otpController = TextEditingController();
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Start Trip - Enter OTP'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ask passenger/requester for the 4 or 6 digit trip start OTP:'),
            const SizedBox(height: 12),
            TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Trip Start OTP',
                hintText: 'e.g. 1234 or 123456',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('VERIFY & START', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && otpController.text.trim().isNotEmpty) {
      setState(() => _isActionInProgress = true);
      try {
        await DriverService.instance.startTrip(tripId, otpController.text.trim());
        Fluttertoast.showToast(
          msg: 'Trip started successfully!',
          backgroundColor: AppColors.accentGreenDark,
        );
        await _fetchTripDetails();
      } catch (e) {
        Fluttertoast.showToast(
          msg: 'Error starting trip: ${e.toString().replaceAll('Exception: ', '')}',
          backgroundColor: AppColors.error,
        );
      } finally {
        if (mounted) setState(() => _isActionInProgress = false);
      }
    }
  }

  Future<void> _handleCompleteTrip(String tripId, String payout) async {
    setState(() => _isActionInProgress = true);
    try {
      await DriverService.instance.completeTrip(tripId);
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Trip completed! $payout credited to your wallet.',
          backgroundColor: AppColors.accentGreenDark,
        );
        if (context.canPop()) {
          context.pop();
        } else {
          context.go(AppRoutes.tripsScreen);
        }
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Error completing trip: ${e.toString().replaceAll('Exception: ', '')}',
        backgroundColor: AppColors.error,
      );
    } finally {
      if (mounted) setState(() => _isActionInProgress = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trip = _trip as Map<String, dynamic>? ?? {};
    final req = trip['requirement'] as Map<String, dynamic>? ?? {};
    final tripId = (trip['id'] ?? 'AY10234').toString();
    final shortTripId = tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : tripId.toUpperCase();
    final status = (trip['status'] ?? 'IN_PROGRESS').toString().toUpperCase();
    final isAssigned = status == 'ASSIGNED' || status == 'DRIVER_ASSIGNED';
    final isArrived = status == 'ARRIVED';
    final isInProgress = status == 'IN_PROGRESS' || status == 'STARTED';
    final isCompleted = status == 'COMPLETED';

    final pickup = trip['pickupLocation']?['address'] ??
        req['pickupLocation']?['address'] ??
        'DLF Cyber City, Gurugram\nTower A, Gate 2';
    final drop = trip['dropLocation']?['address'] ??
        req['dropLocation']?['address'] ??
        'IGI Airport T3, New Delhi\nDeparture Gate Road';
    final payout = '₹${trip['driverEarnings'] ?? trip['fare'] ?? '850'}';
    final passengerName = req['vendor']?['businessName'] ?? 'Corporate Requester';
    final passengerPhone = req['vendor']?['phone'] ?? '+91 98765 43210';
    final vehicle = req['vehicleType']?.toString() ?? 'Sedan';
    final startOtp = trip['startOtp'] ?? req['startOtp'];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.tripsScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Trip Details',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: _fetchTripDetails,
                        icon: Icon(
                          Icons.refresh,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Banner Card ─────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isCompleted
                                ? [AppColors.accentGreenDark, AppColors.accentGreenDark.withValues(alpha: 0.85)]
                                : (isArrived
                                    ? [AppColors.accentPurple, isDark ? AppColors.primaryLight : AppColors.primary]
                                    : [AppColors.primary, AppColors.primaryHover]),
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  isCompleted
                                      ? 'TRIP COMPLETED'
                                      : (isArrived
                                          ? 'ARRIVED AT PICKUP'
                                          : (isAssigned ? 'DRIVER ASSIGNED' : 'TRIP IN PROGRESS')),
                                  style: AppTypography.caption(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (startOtp != null)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.25),
                                      borderRadius: BorderRadius.circular(AppRadius.xs),
                                    ),
                                    child: Text(
                                      'OTP: $startOtp',
                                      style: AppTypography.caption(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Trip ID: $shortTripId',
                                  style: AppTypography.body(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  status,
                                  style: AppTypography.caption(
                                    color: Colors.white.withValues(alpha: 0.8),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Route Details Card ─────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Route ($vehicle)',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Pickup Row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  margin: const EdgeInsets.only(top: 4),
                                  decoration: const BoxDecoration(
                                    color: AppColors.accentGreenDark,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Pickup',
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        pickup,
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Drop Row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  margin: const EdgeInsets.only(top: 4),
                                  decoration: const BoxDecoration(
                                    color: AppColors.error,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Drop',
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        drop,
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Live Map Container ─────────────────────────────────
                      Container(
                        height: 180,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.borderLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: Icon(
                                Icons.map_outlined,
                                size: 80,
                                color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.3),
                              ),
                            ),
                            Positioned(
                              bottom: 12,
                              right: 12,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                ),
                                child: Text(
                                  'GPS Tracking Active',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.bgDark : Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Metrics Grid (Distance, Duration, Earnings) ───────
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricCard(
                              icon: Icons.navigation_outlined,
                              label: 'Distance',
                              value: '18.4 km',
                              isDark: isDark,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildMetricCard(
                              icon: Icons.access_time,
                              label: 'Est. duration',
                              value: '35 min',
                              isDark: isDark,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildMetricCard(
                              icon: Icons.account_balance_wallet_outlined,
                              label: 'Earnings',
                              value: payout,
                              valueColor: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                              isDark: isDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Passenger Info Card ────────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
                              child: Icon(
                                Icons.person,
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    passengerName,
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    passengerPhone,
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => _callPassenger(passengerPhone),
                              icon: Icon(
                                Icons.phone_outlined,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                              ),
                            ),
                            IconButton(
                              onPressed: () => _openChat(passengerName),
                              icon: Icon(
                                Icons.chat_bubble_outline_rounded,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Bottom Action Buttons Based on Status ─────────────
                      if (isAssigned) ...[
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _openNavigation,
                                icon: const Icon(Icons.navigation_outlined, size: 18),
                                label: const Text('NAVIGATE'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  side: BorderSide(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  ),
                                  foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: AppPrimaryButton(
                                text: 'MARK ARRIVED',
                                isLoading: _isActionInProgress,
                                onPressed: () => _handleMarkArrived(tripId),
                              ),
                            ),
                          ],
                        ),
                      ] else if (isArrived) ...[
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _openNavigation,
                                icon: const Icon(Icons.navigation_outlined, size: 18),
                                label: const Text('NAVIGATE'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  side: BorderSide(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  ),
                                  foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: AppPrimaryButton(
                                text: 'START TRIP (OTP)',
                                isLoading: _isActionInProgress,
                                onPressed: () => _handleStartTrip(tripId),
                              ),
                            ),
                          ],
                        ),
                      ] else if (isInProgress) ...[
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _openNavigation,
                                icon: const Icon(Icons.navigation_outlined, size: 18),
                                label: const Text('NAVIGATE'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  side: BorderSide(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  ),
                                  foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: AppPrimaryButton(
                                text: 'COMPLETE TRIP',
                                isLoading: _isActionInProgress,
                                onPressed: () => _handleCompleteTrip(tripId, payout),
                              ),
                            ),
                          ],
                        ),
                      ] else if (isCompleted) ...[
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            border: Border.all(
                              color: isDark ? AppColors.accentGreenDark.withValues(alpha: 0.3) : Colors.transparent,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Trip Settled & Payout Complete ($payout)',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 18,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ).copyWith(fontSize: 11),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: AppTypography.body(
              color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
