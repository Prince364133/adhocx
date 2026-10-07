import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/user_service.dart';
import '../../shared/animations/app_bouncing_wrapper.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/trip_rating_bottom_sheet.dart';

class UserActiveTripScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  final String? tripId;

  const UserActiveTripScreen({
    super.key,
    this.trip,
    this.tripId,
  });

  @override
  State<UserActiveTripScreen> createState() => _UserActiveTripScreenState();
}

class _UserActiveTripScreenState extends State<UserActiveTripScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _trip;
  bool _isLoading = true;
  String? _errorMessage;
  late AnimationController _pulseController;
  Timer? _refreshTimer;
  bool _hasPromptedRating = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    if (widget.trip != null && widget.trip!.isNotEmpty) {
      _trip = widget.trip;
      _isLoading = false;
    }
    _loadActiveTrip();
    _startPeriodicRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startPeriodicRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      final status = _trip?['status']?.toString();
      if (status != 'COMPLETED' && status != 'CANCELLED') {
        _loadActiveTrip(silent: true);
      }
    });
  }

  Future<void> _loadActiveTrip({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = _trip == null);

    try {
      final effectiveTripId = widget.tripId ?? _trip?['id']?.toString() ?? _trip?['tripId']?.toString();

      if (effectiveTripId != null && effectiveTripId.isNotEmpty) {
        final data = await UserService.instance.getTrip(effectiveTripId);
        if (mounted && data is Map) {
          setState(() {
            _trip = Map<String, dynamic>.from(data);
            _errorMessage = null;
          });
          _checkTripCompletionPrompt();
          return;
        }
      }

      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        final active = list.firstWhere(
          (t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED' || t['status'] == 'ASSIGNED' || t['status'] == 'ACCEPTED',
          orElse: () => list.first,
        );
        setState(() {
          _trip = active is Map<String, dynamic> ? active : Map<String, dynamic>.from(active as Map);
          _errorMessage = null;
        });
        _checkTripCompletionPrompt();
      }
    } catch (e) {
      if (!silent && mounted) {
        setState(() => _errorMessage = e.toString().replaceAll('Exception: ', ''));
      }
    } finally {
      if (!silent && mounted) setState(() => _isLoading = false);
    }
  }

  void _checkTripCompletionPrompt() {
    final status = _trip?['status']?.toString();
    if (status == 'COMPLETED' && !_hasPromptedRating) {
      _hasPromptedRating = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          final tripId = _trip?['id']?.toString() ?? widget.tripId ?? '';
          final driver = _trip?['driver'] as Map<String, dynamic>?;
          final driverUser = driver?['user'] as Map<String, dynamic>?;
          final driverName = driverUser?['fullName'] ?? driver?['fullName'] ?? 'Your Driver';
          final vehiclePlate = driver?['vehiclePlate'] ?? _trip?['vehiclePlate'];

          TripRatingBottomSheet.show(
            context: context,
            tripId: tripId,
            targetName: driverName,
            vehicleInfo: vehiclePlate?.toString(),
            isReviewingDriver: true,
          );
        }
      });
    }
  }

  void _showDisputeDialog() {
    final reasonController = TextEditingController();
    final descController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
          title: const Row(
            children: [
              Icon(Icons.report_problem_outlined, color: AppColors.error),
              SizedBox(width: 8),
              Text('Report Issue / Dispute', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Our 24/7 support team will review your report and take immediate action.',
                  style: TextStyle(fontSize: 12, color: AppColors.slate600),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(
                    labelText: 'Issue Category',
                    hintText: 'e.g. Fare dispute, Route issue, Safety',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Provide details about what occurred...',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      if (reasonController.text.trim().isEmpty) return;
                      setDialogState(() => isSubmitting = true);
                      try {
                        final tripId = _trip?['id']?.toString() ?? widget.tripId ?? '';
                        await UserService.instance.createDispute(
                          tripId: tripId,
                          reason: reasonController.text.trim(),
                          description: descController.text.trim(),
                        );
                        if (ctx.mounted) Navigator.of(ctx).pop();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Dispute ticket raised. Support will contact you shortly.'),
                              backgroundColor: AppColors.info,
                            ),
                          );
                        }
                      } catch (e) {
                        setDialogState(() => isSubmitting = false);
                      }
                    },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              child: isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Submit Dispute', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showEmergencyDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        title: const Row(
          children: [
            Icon(Icons.emergency_rounded, color: AppColors.error, size: 28),
            SizedBox(width: 8),
            Text('Emergency Assistance', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.error)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'If you are in immediate danger, please contact local emergency authorities immediately.',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const CircleAvatar(backgroundColor: AppColors.error, child: Icon(Icons.call, color: Colors.white)),
              title: const Text('National Emergency Helpline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('Dial 112 for Police / Ambulance'),
              contentPadding: EdgeInsets.zero,
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: AppColors.primary, child: Icon(Icons.shield, color: Colors.white)),
              title: const Text('AdhocX 24/7 Safety Desk', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('+91 7893545818'),
              trailing: const Icon(Icons.call, color: AppColors.primary, size: 20),
              onTap: () => launchUrl(Uri.parse('tel:+917893545818')),
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = _trip ?? {};
    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;
    final driverName = driverUser?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver';
    final driverPhone = driver?['phone'] ?? driverUser?['phone'] ?? '—';
    final vehiclePlate = driver?['vehiclePlate'] ?? trip['vehiclePlate'] ?? '—';
    final vehicleModel = driver?['vehicleModel'] ?? trip['vehicleModel'] ?? trip['vehicleType'] ?? 'Commercial Fleet';
    final rating = (driver?['averageRating'] ?? driver?['rating'] ?? 5.0).toString();
    final status = (trip['status'] ?? 'IN_PROGRESS').toString();
    final tripCode = trip['id'] != null ? 'TRIP-${trip['id'].toString().substring(0, 8).toUpperCase()}' : 'TRIP-LIVE';
    final otp = trip['startOtp'] ?? trip['otp'] ?? '—';

    final pickup = trip['pickupLocation'] as Map<String, dynamic>?;
    final drop = trip['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? pickup?['fullAddress'] ?? trip['pickupAddress'] ?? 'Pickup Location';
    final dropAddr = drop?['address'] ?? drop?['fullAddress'] ?? trip['dropAddress'] ?? 'Drop Location';

    final isAssigned = status == 'ASSIGNED' || status == 'ACCEPTED' || status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isArrived = status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isStarted = status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isCompleted = status == 'COMPLETED';

    Color statusColor = AppColors.primary;
    if (status == 'ARRIVED') statusColor = AppColors.warning;
    if (status == 'IN_PROGRESS') statusColor = AppColors.info;
    if (status == 'COMPLETED') statusColor = AppColors.success;
    if (status == 'CANCELLED') statusColor = AppColors.error;

    final timelineSteps = [
      {'time': 'Assigned', 'title': 'Driver Assigned & Accepted', 'isDone': isAssigned, 'isCurrent': status == 'ACCEPTED' || status == 'ASSIGNED'},
      {'time': 'Arrived', 'title': 'Driver Arrived at Pickup Location', 'isDone': isArrived, 'isCurrent': status == 'ARRIVED'},
      {'time': 'In-Transit', 'title': 'Trip In Progress with Live Telemetry', 'isDone': isStarted, 'isCurrent': status == 'IN_PROGRESS'},
      {'time': 'Completed', 'title': 'Dropoff & Trip Settlement', 'isDone': isCompleted, 'isCurrent': status == 'COMPLETED'},
    ];

    final initials = driverName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Active Trip Tracking',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () => _loadActiveTrip(silent: false),
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            tooltip: 'Refresh Status',
          ),
          IconButton(
            onPressed: _showEmergencyDialog,
            icon: const Icon(Icons.emergency_rounded, color: AppColors.error),
            tooltip: 'Emergency SOS',
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null && _trip == null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                          const SizedBox(height: 12),
                          Text(_errorMessage!, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          ElevatedButton(onPressed: () => _loadActiveTrip(silent: false), child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Requirement Title Header + Status Badge
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Fleet Trip Details',
                                  style: AppTypography.h3(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  tripCode,
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (status == 'IN_PROGRESS' || status == 'ARRIVED')
                                    AnimatedBuilder(
                                      animation: _pulseController,
                                      builder: (context, _) => Container(
                                        width: 8,
                                        height: 8,
                                        margin: const EdgeInsets.only(right: 6),
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: statusColor,
                                          boxShadow: [
                                            BoxShadow(
                                              color: statusColor.withValues(alpha: _pulseController.value * 0.8),
                                              blurRadius: 6,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  Text(
                                    status.replaceAll('_', ' '),
                                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Trip Completed Celebration Card
                        if (isCompleted) ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.success.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 36),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Trip Completed Successfully',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.success),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Dropoff confirmed. Please rate your driver experience.',
                                        style: TextStyle(fontSize: 11, color: isDark ? AppColors.textSecondaryDark : AppColors.slate700),
                                      ),
                                    ],
                                  ),
                                ),
                                ElevatedButton(
                                  onPressed: () {
                                    final tripId = _trip?['id']?.toString() ?? widget.tripId ?? '';
                                    TripRatingBottomSheet.show(
                                      context: context,
                                      tripId: tripId,
                                      targetName: driverName,
                                      vehicleInfo: vehiclePlate.toString(),
                                      isReviewingDriver: true,
                                      onReviewSubmitted: () => _loadActiveTrip(silent: true),
                                    );
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.starAmber,
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  ),
                                  child: const Text('Rate Driver', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // Driver Arrival Notification Banner
                        if (status == 'ARRIVED') ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.location_on, color: AppColors.warning, size: 28),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Driver has arrived at pickup location',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.slate900),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text(
                                        'Please share your 4-digit Ride Start OTP below to start the ride.',
                                        style: TextStyle(fontSize: 11, color: AppColors.slate600),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // Driver Profile Info Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: AppColors.primary,
                                child: Text(
                                  initials.isNotEmpty ? initials : 'D',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          driverName,
                                          style: AppTypography.h4(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Row(
                                          children: [
                                            const Icon(Icons.star_rounded, size: 14, color: AppColors.starAmber),
                                            const SizedBox(width: 2),
                                            Text(rating, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '$vehiclePlate • $vehicleModel',
                                      style: AppTypography.caption(
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                    if (driverPhone != '—')
                                      Text(
                                        'Phone: $driverPhone',
                                        style: TextStyle(fontSize: 11, color: isDark ? AppColors.textSecondaryDark : AppColors.slate600),
                                      ),
                                  ],
                                ),
                              ),
                              AppBouncingWrapper(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Contacting Driver: $driverPhone'),
                                      duration: const Duration(seconds: 2),
                                    ),
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.phone, color: AppColors.primary, size: 20),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Start OTP Verification Card (Shown until completed)
                        if (!isCompleted && otp != '—') ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.primary.withValues(alpha: 0.12),
                                  AppColors.accentPurple.withValues(alpha: 0.08),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.lock_outline_rounded, size: 16, color: AppColors.primary),
                                        const SizedBox(width: 4),
                                        Text(
                                          'START TRIP OTP',
                                          style: AppTypography.caption(
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Share with driver at pickup to begin',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                                AppBouncingWrapper(
                                  onTap: () {
                                    Clipboard.setData(ClipboardData(text: otp.toString()));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Trip OTP copied to clipboard!'),
                                        duration: Duration(seconds: 2),
                                      ),
                                    );
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.primary.withValues(alpha: 0.35),
                                          blurRadius: 8,
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          otp.toString(),
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 3,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        const Icon(Icons.copy_rounded, size: 14, color: Colors.white70),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // Locations Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.my_location_rounded, size: 16, color: AppColors.success),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Pickup Location', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                        Text(pickupAddr.toString(), style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 8.0),
                                child: Divider(),
                              ),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.pin_drop_rounded, size: 16, color: AppColors.error),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Drop Location', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                        Text(dropAddr.toString(), style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.lg),

                        // Timeline Stepper Section
                        Text(
                          'Trip Lifecycle',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),

                        const SizedBox(height: AppSpacing.sm),

                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            children: List.generate(timelineSteps.length, (index) {
                              final step = timelineSteps[index];
                              final isDone = step['isDone'] == true;
                              final isCurrent = step['isCurrent'] == true;
                              final isLast = index == timelineSteps.length - 1;

                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    width: 80,
                                    child: Text(
                                      step['time'] as String,
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : AppColors.slate400,
                                      ),
                                    ),
                                  ),
                                  Column(
                                    children: [
                                      if (isCurrent)
                                        AnimatedBuilder(
                                          animation: _pulseController,
                                          builder: (context, _) {
                                            return Container(
                                              width: 14,
                                              height: 14,
                                              decoration: BoxDecoration(
                                                color: AppColors.primary,
                                                shape: BoxShape.circle,
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: AppColors.primary.withValues(alpha: _pulseController.value * 0.7),
                                                    blurRadius: 10,
                                                    spreadRadius: 2,
                                                  ),
                                                ],
                                              ),
                                            );
                                          },
                                        )
                                      else
                                        Container(
                                          width: 12,
                                          height: 12,
                                          decoration: BoxDecoration(
                                            color: isDone ? AppColors.primary : (isDark ? AppColors.slate700 : AppColors.slate400),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      if (!isLast) Container(width: 2, height: 32, color: isDone ? AppColors.primary : (isDark ? AppColors.slate800 : AppColors.slate300)),
                                    ],
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Padding(
                                      padding: const EdgeInsets.only(bottom: 16.0),
                                      child: Text(
                                        step['title'] as String,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
                                          color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : AppColors.slate400,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            }),
                          ),
                        ),

                        const SizedBox(height: AppSpacing.lg),

                        // Support & Dispute Action
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _showDisputeDialog,
                                icon: const Icon(Icons.support_agent_rounded, size: 16),
                                label: const Text('Report Issue / Support', style: TextStyle(fontSize: 12)),
                                style: OutlinedButton.styleFrom(
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }
}
