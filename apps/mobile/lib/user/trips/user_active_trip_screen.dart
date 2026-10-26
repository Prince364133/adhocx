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
import '../../shared/widgets/app_profile_avatar.dart';
import '../../core/utils/app_toast.dart';
import '../requirements/user_bids_bottom_sheet.dart';

/// Unified Active Trip Tracking Screen
/// Merges both Requirement Details and Live Active Trip Tracking into a single,
/// clean, minimalistic operational dashboard. Deep metadata (waves, approached drivers,
/// fare breakdown, escrow status) is accessible via the bottom sheet.
class UserActiveTripScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  final String? tripId;
  final String? requirementId;
  final Map<String, dynamic>? initialData;

  const UserActiveTripScreen({
    super.key,
    this.trip,
    this.tripId,
    this.requirementId,
    this.initialData,
  });

  @override
  State<UserActiveTripScreen> createState() => _UserActiveTripScreenState();
}

class _UserActiveTripScreenState extends State<UserActiveTripScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _trip;
  Map<String, dynamic>? _requirement;
  int _selectedVehicleIndex = 0;

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

    // Seed initial data if available
    if (widget.initialData != null && widget.initialData!.isNotEmpty) {
      if (widget.initialData!['pickupLocation'] != null ||
          widget.initialData!['dropLocation'] != null ||
          widget.initialData!['status'] != null) {
        _requirement = widget.initialData;
        _trip = widget.trip ?? widget.initialData;
        _isLoading = false;
      }
    } else if (widget.trip != null && widget.trip!.isNotEmpty) {
      _trip = widget.trip;
      _isLoading = false;
    }

    _loadData();
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
      final status = _trip?['status']?.toString() ?? _requirement?['status']?.toString();
      if (status != 'COMPLETED' && status != 'CANCELLED' && status != 'EXPIRED') {
        _loadData(silent: true);
      }
    });
  }

  num _parseNum(dynamic val, [num defaultVal = 0.0]) {
    if (val == null) return defaultVal;
    if (val is num) return val;
    return num.tryParse(val.toString()) ?? defaultVal;
  }

  String _formatDateTime(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final month = months[dt.month - 1];
      final day = dt.day;
      final year = dt.year;
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$month $day, $year • $hour:$minute $period';
    } catch (_) {
      return dateStr;
    }
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = _trip == null && _requirement == null);

    try {
      final effectiveTripId = widget.tripId ??
          _trip?['id']?.toString() ??
          _trip?['tripId']?.toString() ??
          widget.initialData?['tripId']?.toString();

      final effectiveReqId = widget.requirementId ??
          _requirement?['id']?.toString() ??
          _trip?['requirementId']?.toString() ??
          widget.initialData?['requirementId']?.toString() ??
          widget.initialData?['id']?.toString();

      bool tripLoaded = false;
      bool reqLoaded = false;

      // 1. Fetch Trip details if trip ID exists
      if (effectiveTripId != null && effectiveTripId.isNotEmpty) {
        try {
          final tripData = await UserService.instance.getTrip(effectiveTripId);
          if (tripData is Map && mounted) {
            setState(() {
              _trip = Map<String, dynamic>.from(tripData);
              _errorMessage = null;
            });
            tripLoaded = true;
            _checkTripCompletionPrompt();
          }
        } catch (_) {}
      }

      // 2. Fetch Requirement details if requirement ID exists
      final reqTargetId = effectiveReqId ?? _trip?['requirementId']?.toString();
      if (reqTargetId != null && reqTargetId.isNotEmpty) {
        try {
          final reqData = await UserService.instance.getRequirement(reqTargetId);
          if (reqData is Map && mounted) {
            setState(() {
              _requirement = Map<String, dynamic>.from(reqData);
              _errorMessage = null;
            });
            reqLoaded = true;

            // If trip wasn't loaded directly, resolve from requirement's trips or assignedDrivers
            if (!tripLoaded) {
              final assignedDrivers = _requirement?['assignedDrivers'] is List
                  ? (_requirement!['assignedDrivers'] as List)
                  : [];
              final trips = _requirement?['trips'] is List
                  ? (_requirement!['trips'] as List)
                  : [];

              if (trips.isNotEmpty) {
                final safeIndex = _selectedVehicleIndex.clamp(0, trips.length - 1);
                final t = trips[safeIndex];
                if (t is Map) {
                  setState(() => _trip = Map<String, dynamic>.from(t));
                  tripLoaded = true;
                  _checkTripCompletionPrompt();
                }
              } else if (assignedDrivers.isNotEmpty) {
                final safeIndex = _selectedVehicleIndex.clamp(0, assignedDrivers.length - 1);
                final d = assignedDrivers[safeIndex];
                if (d is Map) {
                  setState(() {
                    _trip = {
                      'id': d['tripId'] ?? d['id'],
                      'status': d['status'] ?? 'ASSIGNED',
                      'startOtp': d['startOtp'] ?? d['otp'],
                      'driver': d['driver'] ?? d,
                      'driverName': d['driverName'] ?? d['fullName'],
                      'driverPhone': d['driverPhone'] ?? d['phone'],
                      'vehiclePlate': d['vehiclePlate'] ?? d['plate'],
                      'vehicleModel': d['vehicleModel'] ?? d['vehicleType'],
                      'pickupLocation': _requirement?['pickupLocation'] ?? _requirement?['pickupAddress'],
                      'dropLocation': _requirement?['dropLocation'] ?? _requirement?['dropAddress'],
                      'agreedRate': _requirement?['ratePerVehicle'],
                    };
                  });
                  tripLoaded = true;
                }
              }
            }
          }
        } catch (_) {}
      }

      // 3. Fallback: query active user trips if nothing was loaded
      if (!tripLoaded && !reqLoaded && mounted) {
        final list = await UserService.instance.getTrips();
        if (list.isNotEmpty && mounted) {
          final active = list.firstWhere(
            (t) =>
                t['status'] == 'IN_PROGRESS' ||
                t['status'] == 'ARRIVED' ||
                t['status'] == 'ASSIGNED' ||
                t['status'] == 'ACCEPTED',
            orElse: () => list.first,
          );
          setState(() {
            _trip = active is Map<String, dynamic> ? active : Map<String, dynamic>.from(active as Map);
            _errorMessage = null;
          });
          _checkTripCompletionPrompt();
        }
      }
    } catch (e) {
      if (!silent && mounted) {
        setState(() => _errorMessage = AppToast.cleanErrorMessage(e));
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
          final driverName = _trip?['driverName']?.toString() ??
              driverUser?['fullName'] ??
              driver?['fullName'] ??
              'Your Driver';
          final vehiclePlate = _trip?['vehiclePlate'] ?? driver?['vehiclePlate'];

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

  Future<void> _callDriver(String phone) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isNotEmpty && phone != '—') {
      final phoneUri = Uri.parse('tel:$cleanPhone');
      try {
        if (await canLaunchUrl(phoneUri)) {
          await launchUrl(phoneUri);
        } else {
          await launchUrl(phoneUri, mode: LaunchMode.externalApplication);
        }
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not open dialer for: $phone'),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Driver phone number is not available. Contact 24/7 Safety Desk.'),
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showDisputeDialog() {
    final reasonController = TextEditingController();
    final descController = TextEditingController();
    bool isSubmitting = false;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final bottomInset = MediaQuery.of(ctx).viewInsets.bottom;
          return Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
            ),
            padding: EdgeInsets.only(
              left: AppSpacing.lg,
              right: AppSpacing.lg,
              top: AppSpacing.md,
              bottom: AppSpacing.xl + bottomInset,
            ),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 38,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                          borderRadius: AppRadius.borderPill,
                        ),
                      ),
                    ),
                    const Row(
                      children: [
                        Icon(Icons.report_problem_outlined, color: AppColors.error),
                        SizedBox(width: 8),
                        Text('Report Issue / Dispute', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
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
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 46,
                      child: ElevatedButton(
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
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.error,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        child: isSubmitting
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Submit Dispute', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: const Text('Cancel'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showEmergencyDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.emergency_rounded, color: AppColors.error, size: 28),
                  SizedBox(width: 8),
                  Text('Emergency Assistance', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.error, fontSize: 16)),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'If you are in immediate danger, please contact local authorities immediately.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const CircleAvatar(backgroundColor: AppColors.error, child: Icon(Icons.call, color: Colors.white)),
                title: const Text('National Emergency Helpline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Dial 112 for Police / Ambulance'),
                contentPadding: EdgeInsets.zero,
                onTap: () => launchUrl(Uri.parse('tel:112')),
              ),
              ListTile(
                leading: const CircleAvatar(backgroundColor: AppColors.primary, child: Icon(Icons.shield, color: Colors.white)),
                title: const Text('AdhocX 24/7 Safety Desk', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('+91 7893545818'),
                trailing: const Icon(Icons.call, color: AppColors.primary, size: 20),
                onTap: () => launchUrl(Uri.parse('tel:+917893545818')),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmCancelRequirement(BuildContext context, String reqId) async {
    final messenger = ScaffoldMessenger.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirm = await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              Text(
                'Cancel Searching?',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Are you sure you want to stop searching for drivers? This will immediately cancel dispatch waves and return any escrow funds to your wallet.',
                style: AppTypography.body(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 46,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                  child: const Text('Stop & Cancel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Keep Searching'),
              ),
            ],
          ),
        ),
      ),
    );

    if (confirm == true && mounted) {
      setState(() => _isLoading = true);
      try {
        await UserService.instance.cancelRequirement(reqId, reason: 'Cancelled by user');
        if (mounted) {
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Search stopped and requirement cancelled.'),
              backgroundColor: AppColors.primary,
            ),
          );
          _refreshTimer?.cancel();
          await _loadData(silent: false);
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          AppToast.showError(e);
        }
      }
    }
  }

  Future<void> _handleRetryDispatch(BuildContext context, String reqId) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _isLoading = true);
    try {
      await UserService.instance.retryRequirement(reqId);
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Re-dispatch waves initiated. Searching for nearby verified drivers...'),
            backgroundColor: AppColors.success,
          ),
        );
        await _loadData(silent: false);
        _startPeriodicRefresh();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        AppToast.showError(e);
      }
    }
  }

  /// Minimalist Bottom Sheet containing all deep booking, requirement, wave, and approached driver details
  void _showRequirementDetailsBottomSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final req = _requirement ?? _trip ?? {};
    final status = (req['status'] ?? _trip?['status'] ?? 'POSTED').toString();
    final vehicle = req['vehicleType']?.toString() ?? _trip?['vehicleModel'] ?? 'Sedan';
    final requiredQty = _parseNum(req['quantity'] ?? req['requiredQuantity'], 1).toInt();
    final assignedQty = _parseNum(req['assignedQuantity'], _trip != null ? 1 : 0).toInt();
    final budget = _parseNum(req['ratePerVehicle'] ?? req['suggestedBudget'] ?? _trip?['agreedRate'], 800.0);
    final wave = req['dispatchWaves']?.toString() ?? '1';
    final createdAt = req['createdAt']?.toString() ?? _trip?['createdAt']?.toString();
    final formattedDate = _formatDateTime(createdAt);
    final offers = req['offers'] is List ? (req['offers'] as List) : [];
    final rawId = req['id']?.toString() ?? _trip?['id']?.toString() ?? '';
    final isSearching = status == 'POSTED' || status == 'DISPATCHING' || status == 'OPEN';
    final isBidding = req['fulfillmentMode'] == 'BIDDING';

    // Extract approached drivers
    final approachedDrivers = <Map<String, dynamic>>[];
    for (final o in offers) {
      if (o is Map) {
        final driverObj = o['driver'] is Map ? o['driver'] as Map : null;
        final name = (o['driverName'] ?? driverObj?['fullName'] ?? 'Verified Driver').toString();
        approachedDrivers.add({
          'name': name,
          'plate': driverObj?['vehiclePlate']?.toString() ?? 'Verified Fleet',
          'vehicle': driverObj?['vehicleModel']?.toString() ?? vehicle,
          'status': o['status']?.toString() ?? 'Contacted',
        });
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.35),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppColors.slate700 : AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Requirement Details',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '$formattedDate • Wave $wave',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(Icons.close_rounded, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Financial & Escrow Summary
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: isDark ? 0.12 : 0.06),
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Rate per Vehicle',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '₹${budget.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.shield_outlined, size: 14, color: AppColors.success),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Escrow Secured',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.success : AppColors.success,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$assignedQty of $requiredQty Assigned',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Booking Specifications Grid
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
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Vehicle Category', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    const SizedBox(height: 2),
                                    Text(vehicle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Booking Type', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    const SizedBox(height: 2),
                                    Text(isBidding ? 'Reverse Auction' : 'Corporate Direct', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Divider(),
                          ),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Escort Required', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    const SizedBox(height: 2),
                                    Text((req['hasEscort'] == true || req['escortRequired'] == true) ? 'Yes • Guard Assigned' : 'No', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Wave Dispatch', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    const SizedBox(height: 2),
                                    Text('$wave In Waves', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Approached Drivers Section (from Screen 1)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.people_alt_outlined, size: 18, color: AppColors.primary),
                            const SizedBox(width: 6),
                            Text(
                              'Approached Drivers (${approachedDrivers.length})',
                              style: AppTypography.h4(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '${approachedDrivers.length} Contacted',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    if (approachedDrivers.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Row(
                          children: [
                            Icon(isSearching ? Icons.radar_rounded : Icons.check_circle_outline, color: AppColors.primary, size: 24),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                isSearching
                                    ? 'Broadcasting to nearby verified drivers matching criteria...'
                                    : 'Drivers accepted this requirement directly.',
                                style: TextStyle(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ...approachedDrivers.map((d) => Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: AppColors.primary.withValues(alpha: 0.2),
                                  child: Text(
                                    d['name'].toString().isNotEmpty ? d['name'][0].toUpperCase() : 'D',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(d['name'].toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.verified_rounded, size: 14, color: AppColors.primary),
                                        ],
                                      ),
                                      Text('${d['plate']} • ${d['vehicle']}', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppRadius.xs),
                                  ),
                                  child: Text(
                                    d['status'].toString(),
                                    style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          )),

                    if (isBidding) ...[
                      const SizedBox(height: AppSpacing.md),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          UserBidsBottomSheet.show(
                            context,
                            requirementId: rawId,
                            onBidAccepted: () => _loadData(silent: false),
                          );
                        },
                        icon: const Icon(Icons.gavel_rounded, size: 16),
                        label: const Text('View Driver Bids & Quotes'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          minimumSize: const Size.fromHeight(44),
                        ),
                      ),
                    ],

                    if (isSearching && rawId.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _confirmCancelRequirement(context, rawId);
                        },
                        icon: const Icon(Icons.cancel_outlined, size: 16, color: AppColors.error),
                        label: const Text('Cancel Requirement & Refund Escrow', style: TextStyle(color: AppColors.error)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.error),
                          minimumSize: const Size.fromHeight(44),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = _trip ?? {};
    final req = _requirement ?? {};

    final status = (trip['status'] ?? req['status'] ?? 'IN_PROGRESS').toString();
    final isSearching = _trip == null && (status == 'POSTED' || status == 'DISPATCHING' || status == 'OPEN');
    final isNoDriver = status == 'NO_DRIVER_AVAILABLE';

    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;
    final driverName = (trip['driverName'] ?? driverUser?['fullName'] ?? driver?['fullName'] ?? 'Simplicion').toString();
    final driverPhone = (trip['driverPhone'] ?? driver?['phone'] ?? driverUser?['phone'] ?? '—').toString();
    final vehiclePlate = (trip['vehiclePlate'] ?? driver?['vehiclePlate'] ?? 'SDFDSDF31').toString();
    final vehicleModel = (trip['vehicleModel'] ?? driver?['vehicleModel'] ?? req['vehicleType'] ?? trip['vehicleType'] ?? 'Toyota Etios').toString();
    final rating = (driver?['averageRating'] ?? driver?['rating'] ?? trip['rating'] ?? 5.0).toString();
    final otp = (trip['startOtp'] ?? trip['otp'] ?? req['startOtp'] ?? '—').toString();

    final rateNum = _parseNum(req['ratePerVehicle'] ?? trip['agreedRate'] ?? req['suggestedBudget'] ?? req['totalAmount'], 800.0);
    final rateStr = '₹${rateNum.toStringAsFixed(0)}';
    final vehicleCategory = (req['vehicleType'] ?? trip['vehicleType'] ?? 'Sedan').toString();
    final requiredQty = _parseNum(req['quantity'] ?? req['requiredQuantity'], 1).toInt();
    final assignedDrivers = req['assignedDrivers'] is List ? (req['assignedDrivers'] as List) : [];

    final rawTripId = trip['id']?.toString() ?? widget.tripId;
    final rawReqId = req['id']?.toString() ?? widget.requirementId;
    final displayCode = rawTripId != null && rawTripId.length > 8
        ? 'TRIP-${rawTripId.substring(0, 8).toUpperCase()}'
        : (rawReqId != null && rawReqId.length > 8
            ? 'REQ-${rawReqId.substring(0, 8).toUpperCase()}'
            : 'TRIP-E2D1A5D3');

    // Pickup & Drop
    final pickup = trip['pickupLocation'] ?? req['pickupLocation'];
    final drop = trip['dropLocation'] ?? req['dropLocation'];
    String pickupAddr = 'Gar Laxmi Infobahn, 12th Floor-Tower-2, Sy no.107(P, Village, Kokapet, Hyderabad, Telangana 500075, India';
    String dropAddr = 'Begumpet, Hyderabad, Telangana';

    if (pickup is Map) {
      pickupAddr = (pickup['address'] ?? pickup['fullAddress'] ?? pickupAddr).toString();
    } else if (pickup is String && pickup.isNotEmpty) {
      pickupAddr = pickup;
    } else if (trip['pickupAddress'] != null) {
      pickupAddr = trip['pickupAddress'].toString();
    } else if (req['pickupAddress'] != null) {
      pickupAddr = req['pickupAddress'].toString();
    }

    if (drop is Map) {
      dropAddr = (drop['address'] ?? drop['fullAddress'] ?? dropAddr).toString();
    } else if (drop is String && drop.isNotEmpty) {
      dropAddr = drop;
    } else if (trip['dropAddress'] != null) {
      dropAddr = trip['dropAddress'].toString();
    } else if (req['dropAddress'] != null) {
      dropAddr = req['dropAddress'].toString();
    }

    final isAssigned = status == 'ASSIGNED' || status == 'ACCEPTED' || status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isArrived = status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isStarted = status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isCompleted = status == 'COMPLETED';

    Color statusColor = AppColors.primary;
    if (status == 'ARRIVED') statusColor = AppColors.warning;
    if (status == 'IN_PROGRESS') statusColor = AppColors.info;
    if (status == 'COMPLETED') statusColor = AppColors.success;
    if (status == 'CANCELLED' || status == 'EXPIRED') statusColor = AppColors.error;

    final timelineSteps = [
      {'time': 'Assigned', 'title': 'Driver Assigned & Accepted', 'isDone': isAssigned, 'isCurrent': status == 'ACCEPTED' || status == 'ASSIGNED'},
      {'time': 'Arrived', 'title': 'Driver Arrived at Pickup Location', 'isDone': isArrived, 'isCurrent': status == 'ARRIVED'},
      {'time': 'In-Transit', 'title': 'Trip In Progress with Live Telemetry', 'isDone': isStarted, 'isCurrent': status == 'IN_PROGRESS'},
      {'time': 'Completed', 'title': 'Dropoff & Trip Settlement', 'isDone': isCompleted, 'isCurrent': status == 'COMPLETED'},
    ];

    final driverPhoto = (trip['driverPhoto'] ?? driver?['photoUrl'] ?? driver?['profilePhotoUrl'] ?? driverUser?['photoUrl'])?.toString();

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
            onPressed: () => _showRequirementDetailsBottomSheet(context),
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: 'Booking Details',
          ),
          IconButton(
            onPressed: () => _loadData(silent: false),
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
            : _errorMessage != null && _trip == null && _requirement == null
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
                          ElevatedButton(onPressed: () => _loadData(silent: false), child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── Header Row: Code + Status Badge ─────────────────────
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isSearching ? 'Requirement Dispatch' : 'Fleet Trip Details',
                                  style: AppTypography.h3(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  displayCode,
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
                                  if (status == 'IN_PROGRESS' || status == 'ARRIVED' || isSearching)
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

                        const SizedBox(height: 10),

                        // ── Minimalist Metadata Pills (Merged from Screen 1) ────
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            // Rate per Vehicle Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.full),
                                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text('Rate: ', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
                                  Text(
                                    '$rateStr / veh',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                                  ),
                                ],
                              ),
                            ),

                            // Vehicle Category Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.full),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: Text(
                                '$vehicleCategory • $requiredQty Veh',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ),
                            ),

                            // Escort badge if applicable
                            if (req['hasEscort'] == true || req['escortRequired'] == true)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.accentPurple.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.security_rounded, size: 12, color: AppColors.accentPurple),
                                    SizedBox(width: 4),
                                    Text('Escort', style: TextStyle(fontSize: 11, color: AppColors.accentPurple, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                          ],
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // ── Searching / Dispatching Wave Banner ─────────────────
                        if (isSearching) ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.5),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Broadcasting Dispatch Waves',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Contacting verified drivers in the region. Tap below to see details.',
                                        style: TextStyle(fontSize: 11, color: isDark ? AppColors.textSecondaryDark : AppColors.slate700),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // ── No Driver Available Warning Banner ─────────────────
                        if (isNoDriver) ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 26),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'No Drivers Accepted',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.warning),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Window elapsed without acceptance. You can retry dispatch or cancel for escrow refund.',
                                        style: TextStyle(fontSize: 11, color: isDark ? AppColors.textSecondaryDark : AppColors.slate700),
                                      ),
                                    ],
                                  ),
                                ),
                                ElevatedButton(
                                  onPressed: () => _handleRetryDispatch(context, rawReqId ?? ''),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.warning,
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  ),
                                  child: const Text('Retry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // ── Trip Completed Celebration Card ────────────────────
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
                                      vehicleInfo: vehiclePlate,
                                      isReviewingDriver: true,
                                      onReviewSubmitted: () => _loadData(silent: true),
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

                        // ── Driver Arrival Notification Banner ─────────────────
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

                        // ── Multi-Vehicle Tabs (For Bulk Bookings) ───────────────
                        if (assignedDrivers.length > 1) ...[
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: List.generate(assignedDrivers.length, (idx) {
                                final isSelected = idx == _selectedVehicleIndex;
                                final d = assignedDrivers[idx] as Map<String, dynamic>;
                                final dName = (d['driverName'] ?? d['fullName'] ?? 'Driver ${idx + 1}').toString();
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8.0, bottom: 8.0),
                                  child: ChoiceChip(
                                    label: Text('Vehicle ${idx + 1}: $dName'),
                                    selected: isSelected,
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          _selectedVehicleIndex = idx;
                                          _trip = {
                                            'id': d['tripId'] ?? d['id'],
                                            'status': d['status'] ?? 'ASSIGNED',
                                            'startOtp': d['startOtp'] ?? d['otp'],
                                            'driver': d['driver'] ?? d,
                                            'driverName': dName,
                                            'driverPhone': d['driverPhone'] ?? d['phone'],
                                            'vehiclePlate': d['vehiclePlate'] ?? d['plate'],
                                            'vehicleModel': d['vehicleModel'] ?? d['vehicleType'],
                                            'pickupLocation': req['pickupLocation'] ?? req['pickupAddress'],
                                            'dropLocation': req['dropLocation'] ?? req['dropAddress'],
                                            'agreedRate': req['ratePerVehicle'],
                                          };
                                        });
                                      }
                                    },
                                    selectedColor: AppColors.primary,
                                    labelStyle: TextStyle(
                                      color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      fontSize: 12,
                                    ),
                                  ),
                                );
                              }),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                        ],

                        // ── Driver Profile Card (Minimalist & Matching Screens) ──
                        if (!isSearching) ...[
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
                                AppProfileAvatar(
                                  radius: 24,
                                  imageUrl: driverPhoto,
                                  name: driverName,
                                  isDark: isDark,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              driverName,
                                              style: AppTypography.h4(
                                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Icon(Icons.verified_rounded, size: 16, color: AppColors.primary),
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
                                        InkWell(
                                          onTap: () => _callDriver(driverPhone),
                                          child: Text(
                                            'Phone: $driverPhone',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? AppColors.primary : AppColors.primaryDark,
                                              fontWeight: FontWeight.w600,
                                              decoration: TextDecoration.underline,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                AppBouncingWrapper(
                                  onTap: () => _callDriver(driverPhone),
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
                        ],

                        // ── Start OTP Verification Card ─────────────────────────
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

                        // ── Locations Card (Pickup & Drop) ──────────────────────
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
                                        Text(pickupAddr, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
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
                                        Text(dropAddr, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.lg),

                        // ── Timeline Stepper Section ─────────────────────────────
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

                        // ── Minimalist Bottom Actions (Details BottomSheet & Support) ──
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => _showRequirementDetailsBottomSheet(context),
                                icon: const Icon(Icons.receipt_long_rounded, size: 16),
                                label: const Text('Booking Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  padding: const EdgeInsets.symmetric(vertical: 11),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _showDisputeDialog,
                                icon: const Icon(Icons.support_agent_rounded, size: 16),
                                label: const Text('Support / Issue', style: TextStyle(fontSize: 12)),
                                style: OutlinedButton.styleFrom(
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  padding: const EdgeInsets.symmetric(vertical: 11),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                    ),
                  ),
      ),
    );
  }
}
