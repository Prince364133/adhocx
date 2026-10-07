import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../shared/widgets/trip_rating_bottom_sheet.dart';
import 'user_bids_bottom_sheet.dart';

class UserRequirementDetailsScreen extends StatefulWidget {
  final String? requirementId;
  final Map<String, dynamic>? initialData;

  const UserRequirementDetailsScreen({
    super.key,
    this.requirementId,
    this.initialData,
  });

  @override
  State<UserRequirementDetailsScreen> createState() => _UserRequirementDetailsScreenState();
}

class _UserRequirementDetailsScreenState extends State<UserRequirementDetailsScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _requirement;
  String? _errorMessage;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null && widget.initialData!.length > 1) {
      _requirement = widget.initialData;
      _isLoading = false;
    }
    _loadRequirement();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  bool _isSyncing = false;

  void _startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      final status = _requirement?['status'] as String?;
      if (status == 'POSTED' || status == 'DISPATCHING' || status == 'PARTIALLY_FULFILLED' || status == 'OPEN') {
        _loadRequirement(silent: true);
      }
    });
  }

  Future<void> _loadRequirement({bool silent = false}) async {
    if (_isSyncing) return;
    _isSyncing = true;
    if (!silent) {
      setState(() {
        _isLoading = _requirement == null;
        _errorMessage = null;
      });
    }

    try {
      final effectiveId = widget.requirementId ?? _requirement?['id']?.toString();
      final isUuid = effectiveId != null &&
          RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
              .hasMatch(effectiveId);

      if (isUuid) {
        final data = await UserService.instance.getRequirement(effectiveId);
        if (mounted && data is Map) {
          setState(() => _requirement = Map<String, dynamic>.from(data));
        }
      } else {
        // Fallback: fetch most recent requirements for current vendor
        final list = await UserService.instance.getRequirements();
        if (list.isNotEmpty && mounted) {
          final match = list.firstWhere(
            (r) => r is Map && r['id']?.toString() == effectiveId,
            orElse: () => list.first,
          );
          if (match is Map && match['id'] != null) {
            final targetId = match['id'].toString();
            if (RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
                .hasMatch(targetId)) {
              final full = await UserService.instance.getRequirement(targetId);
              if (mounted && full is Map) {
                setState(() => _requirement = Map<String, dynamic>.from(full));
              }
            } else if (mounted) {
              setState(() => _requirement = Map<String, dynamic>.from(match));
            }
          }
        }
      }
    } catch (e) {
      if (!silent && mounted) setState(() => _errorMessage = e.toString().replaceAll("Exception: ", ""));
    } finally {
      _isSyncing = false;
      if (!silent && mounted) setState(() => _isLoading = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED':
      case 'FULFILLED':
        return AppColors.success;
      case 'DISPATCHING':
      case 'IN_PROGRESS':
      case 'OPEN':
      case 'POSTED':
        return AppColors.primary;
      case 'PARTIALLY_FULFILLED':
      case 'ACTIVE':
        return AppColors.warning;
      case 'NO_DRIVER_AVAILABLE':
        return AppColors.warning;
      case 'CANCELLED':
      case 'EXPIRED':
        return AppColors.error;
      default:
        return AppColors.slate500;
    }
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

  int _calculateDurationMinutes(String? startStr, String? endStr) {
    if (startStr == null || startStr.isEmpty) return 1;
    try {
      final start = DateTime.parse(startStr);
      final end = (endStr != null && endStr.isNotEmpty) ? DateTime.parse(endStr) : DateTime.now();
      final diff = end.difference(start).inMinutes;
      return diff < 1 ? 1 : diff;
    } catch (_) {
      return 1;
    }
  }

  Future<void> _confirmCancelRequirement(BuildContext context, String rawId) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Searching?'),
        content: const Text(
          'Are you sure you want to stop searching for drivers? This will immediately cancel dispatch waves and return any escrow funds to your wallet.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Searching'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Stop & Cancel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      setState(() => _isLoading = true);
      try {
        await UserService.instance.cancelRequirement(rawId, reason: 'Cancelled by user');
        if (mounted) {
          messenger.showSnackBar(
            const SnackBar(
              content: Text('Search stopped and requirement cancelled.'),
              backgroundColor: AppColors.primary,
            ),
          );
          _refreshTimer?.cancel();
          await _loadRequirement(silent: false);
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          messenger.showSnackBar(
            SnackBar(content: Text('Failed to cancel: $e'), backgroundColor: AppColors.error),
          );
        }
      }
    }
  }

  Future<void> _handleRetryDispatch(BuildContext context, String rawId) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _isLoading = true);
    try {
      await UserService.instance.retryRequirement(rawId);
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Re-dispatch waves initiated. Searching for nearby verified drivers...'),
            backgroundColor: AppColors.success,
          ),
        );
        await _loadRequirement(silent: false);
        _startAutoRefresh();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        messenger.showSnackBar(
          SnackBar(content: Text('Retry failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  num _parseNum(dynamic val, [num defaultVal = 0.0]) {
    if (val == null) return defaultVal;
    if (val is num) return val;
    return num.tryParse(val.toString()) ?? defaultVal;
  }

  String _formatDuration(int minutes) {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return '$minutes mins';
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (mins == 0) return '${hours}h';
    return '${hours}h ${mins}m';
  }

  Color _getOfferStatusColor(String status) {
    switch (status) {
      case 'ACCEPTED':
        return AppColors.success;
      case 'SENT':
        return AppColors.primary;
      case 'DECLINED':
        return AppColors.error;
      case 'EXPIRED':
        return AppColors.slate500;
      case 'CANCELLED':
        return AppColors.slate400;
      default:
        return AppColors.slate500;
    }
  }

  String _getOfferStatusLabel(String status) {
    switch (status) {
      case 'ACCEPTED':
        return 'Accepted';
      case 'SENT':
        return 'Offer Sent';
      case 'DECLINED':
        return 'Declined';
      case 'EXPIRED':
        return 'Expired (No Response)';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status.replaceAll('_', ' ');
    }
  }

  Widget _buildTelemetryCell({
    required String title,
    required String value,
    required IconData icon,
    required bool isDark,
    Color? valueColor,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            const SizedBox(width: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ),
      ],
    );
  }

  Widget _buildApproachedDriversSection({
    required List offers,
    required bool isDark,
    required bool isSearching,
    required bool isNoDriver,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.people_alt_outlined, size: 18, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  'Approached Drivers (${offers.length})',
                  style: AppTypography.h4(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            if (offers.isNotEmpty)
              Text(
                '${offers.length} Dispatched',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (offers.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            child: Column(
              children: [
                Icon(
                  isSearching ? Icons.radar_rounded : Icons.person_search_outlined,
                  size: 32,
                  color: isSearching ? AppColors.primary : AppColors.slate400,
                ),
                const SizedBox(height: 8),
                Text(
                  isSearching ? 'Broadcasting dispatch waves...' : 'No drivers were approached in this wave',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isSearching
                      ? 'Matching nearby verified drivers matching vehicle type & rating criteria...'
                      : 'No verified drivers were within range during the dispatch window.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: offers.length,
            itemBuilder: (context, index) {
              final o = offers[index];
              if (o is! Map) return const SizedBox.shrink();

              final driverName = o['driverName']?.toString() ?? 'Verified Partner';
              final driverPhone = o['driverPhone']?.toString() ?? '—';
              final rating = _parseNum(o['driverRating'], 4.9).toDouble();
              final trustScore = _parseNum(o['driverTrustScore'], 95.0).toDouble();
              final vehicleModel = o['vehicleModel']?.toString() ?? 'Commercial Vehicle';
              final vehiclePlate = o['vehiclePlate']?.toString() ?? '—';
              final offeredRate = _parseNum(o['offeredRate'], 0.0).toDouble();
              final rawStatus = (o['status']?.toString() ?? 'SENT').toUpperCase();
              final statusColor = _getOfferStatusColor(rawStatus);
              final statusLabel = _getOfferStatusLabel(rawStatus);
              final sentAt = _formatDateTime(o['createdAt']?.toString());

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: rawStatus == 'ACCEPTED'
                        ? AppColors.success.withValues(alpha: 0.6)
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Row 1: Profile + Rating + Status Chip
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                          child: Text(
                            driverName.isNotEmpty ? driverName[0].toUpperCase() : 'D',
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
                                  Flexible(
                                    child: Text(
                                      driverName,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.verified, size: 14, color: AppColors.primary),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(Icons.star_rounded, size: 14, color: AppColors.starAmber),
                                  const SizedBox(width: 2),
                                  Text(
                                    rating.toStringAsFixed(1),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                  Text(
                                    ' • ${trustScore.toStringAsFixed(0)}% Trust',
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
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.xs),
                            border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            statusLabel,
                            style: TextStyle(
                              color: statusColor,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    // Row 2: Vehicle details & Offered Rate
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.directions_car_rounded, size: 14, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            const SizedBox(width: 6),
                            Text(
                              '$vehicleModel • $vehiclePlate',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '₹ ${offeredRate.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    // Row 3: Timestamp & Contact
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.schedule_rounded, size: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            const SizedBox(width: 4),
                            Text(
                              'Dispatched: $sentAt',
                              style: TextStyle(
                                fontSize: 10,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                        if (driverPhone != '—')
                          Text(
                            driverPhone,
                            style: TextStyle(
                              fontSize: 10,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final req = _requirement;
    final status = req?['status']?.toString() ?? 'POSTED';
    final statusColor = _getStatusColor(status);
    final requiredQty = _parseNum(req?['quantity'] ?? req?['requiredQuantity'], 1).toInt();
    final assignedQty = _parseNum(req?['assignedQuantity'], 0).toInt();
    final progress = requiredQty > 0 ? (assignedQty / requiredQty).clamp(0.0, 1.0) : 0.0;
    final rawId = req?['id']?.toString() ?? widget.requirementId ?? 'LIVE';
    final displayId = rawId.length > 8 ? 'REQ-${rawId.substring(0, 8).toUpperCase()}' : rawId;

    final isBidding = req?['fulfillmentMode'] == 'BIDDING';
    final vehicle = req?['vehicleType']?.toString() ?? 'Sedan';

    final isFulfilled = status == 'FULFILLED' || status == 'COMPLETED' || (requiredQty > 0 && assignedQty >= requiredQty);
    final isCancelled = status == 'CANCELLED';
    final isExpired = status == 'EXPIRED';
    final isNoDriver = status == 'NO_DRIVER_AVAILABLE';
    final isPartiallyFulfilled = status == 'PARTIALLY_FULFILLED';
    final isSearching = !isFulfilled && !isCancelled && !isExpired && !isNoDriver && (status == 'POSTED' || status == 'DISPATCHING' || status == 'OPEN');

    final offers = req?['offers'] is List ? (req!['offers'] as List) : [];
    final driversApproachedCount = _parseNum(req?['driversApproachedCount'] ?? offers.length, offers.length).toInt();
    final searchStartedAt = req?['searchStartedAt']?.toString() ?? req?['createdAt']?.toString();
    final searchEndedAt = req?['searchEndedAt']?.toString() ?? (isSearching ? null : req?['updatedAt']?.toString());
    final searchDurationMinutes = _parseNum(req?['searchDurationMinutes'], _calculateDurationMinutes(searchStartedAt, searchEndedAt)).toInt();

    String pickup = 'Pickup Location';
    final rawPickup = req?['pickupLocation'] ?? req?['pickupAddress'];
    if (rawPickup is Map) {
      pickup = (rawPickup['address'] ?? rawPickup['fullAddress'] ?? 'Pickup Location').toString();
    } else if (rawPickup is String && rawPickup.isNotEmpty) {
      pickup = rawPickup;
    }

    String drop = 'Drop Location';
    final rawDrop = req?['dropLocation'] ?? req?['dropAddress'];
    if (rawDrop is Map) {
      drop = (rawDrop['address'] ?? rawDrop['fullAddress'] ?? 'Drop Location').toString();
    } else if (rawDrop is String && rawDrop.isNotEmpty) {
      drop = rawDrop;
    }

    final budget = _parseNum(req?['ratePerVehicle'] ?? req?['suggestedBudget'] ?? req?['totalAmount'], 0.0);
    final bids = req?['bids'] is List ? (req!['bids'] as List) : [];
    final assignedDrivers = req?['assignedDrivers'] is List ? (req!['assignedDrivers'] as List) : [];

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
          'Requirement Details',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          if (isSearching)
            TextButton.icon(
              onPressed: () => _confirmCancelRequirement(context, rawId),
              icon: const Icon(Icons.cancel_outlined, color: AppColors.error, size: 16),
              label: const Text(
                'Cancel',
                style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          IconButton(
            onPressed: () => _loadRequirement(silent: false),
            icon: Icon(Icons.refresh, color: AppColors.primary),
            tooltip: 'Refresh Status',
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline, size: 48, color: AppColors.error),
                          const SizedBox(height: 12),
                          Text(_errorMessage!, textAlign: TextAlign.center, style: TextStyle(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                          const SizedBox(height: 16),
                          ElevatedButton(onPressed: () => _loadRequirement(silent: false), child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : req == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.assignment_outlined, size: 56, color: AppColors.slate400),
                              const SizedBox(height: 16),
                              Text(
                                'No Requirement Details Found',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Select a requirement from your active bookings list.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 20),
                              ElevatedButton(
                                onPressed: () => context.go(AppRoutes.userRequirementsScreen),
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                child: const Text('View All Requirements', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        ),
                      )
                    : SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status Header Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: statusColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: Text(
                                      status.replaceAll('_', ' '),
                                      style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                                    ),
                                  ),
                                  Text(
                                    displayId,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                isBidding ? 'Outstation Reverse Auction' : 'Corporate Bulk Booking',
                                style: AppTypography.h2(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$vehicle • $requiredQty Vehicle${requiredQty > 1 ? "s" : ""}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Fulfillment Progress Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Fulfillment Progress',
                                    style: AppTypography.h4(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    '$assignedQty / $requiredQty Fulfilled',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isFulfilled
                                          ? AppColors.success
                                          : (isNoDriver ? AppColors.warning : AppColors.primary),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              LinearProgressIndicator(
                                value: progress,
                                backgroundColor: isDark ? AppColors.slate800 : AppColors.slate200,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  isFulfilled
                                      ? AppColors.success
                                      : (isNoDriver ? AppColors.warning : AppColors.primary),
                                ),
                                minHeight: 8,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              const SizedBox(height: 10),
                              if (isSearching) ...[
                                Row(
                                  children: [
                                    const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        isBidding
                                            ? 'Waiting for driver quotes...'
                                            : 'Actively dispatching waves to nearby verified drivers...',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ] else if (isNoDriver) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: AppColors.warning.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                    border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.info_outline_rounded, size: 18, color: AppColors.warning),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Search Concluded • No Drivers Available',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.warning,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'No driver accepted the rate within the search window. You can retry dispatch waves or cancel to refund escrow holds.',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ] else if (isFulfilled) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.success),
                                    const SizedBox(width: 6),
                                    Text(
                                      'All $requiredQty vehicle${requiredQty > 1 ? "s" : ""} fulfilled successfully!',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.success),
                                    ),
                                  ],
                                ),
                              ] else if (isCancelled) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.cancel_outlined, size: 16, color: AppColors.error),
                                    const SizedBox(width: 6),
                                    const Text(
                                      'Requirement search was cancelled.',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.error),
                                    ),
                                  ],
                                ),
                              ] else if (isExpired) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.timer_off_outlined, size: 16, color: AppColors.slate400),
                                    const SizedBox(width: 6),
                                    const Text(
                                      'Search window expired.',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate400),
                                    ),
                                  ],
                                ),
                              ] else if (isPartiallyFulfilled) ...[
                                Row(
                                  children: [
                                    const Icon(Icons.info_outline, size: 16, color: AppColors.warning),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Search ended with $assignedQty of $requiredQty fulfilled.',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.warning),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Search & Dispatch Telemetry Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.insights_rounded, size: 18, color: AppColors.primary),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Search & Dispatch Telemetry',
                                        style: AppTypography.h4(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: (isSearching ? AppColors.primary : (isNoDriver ? AppColors.warning : AppColors.slate500)).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(AppRadius.xs),
                                      border: Border.all(
                                        color: (isSearching ? AppColors.primary : (isNoDriver ? AppColors.warning : AppColors.slate500)).withValues(alpha: 0.3),
                                      ),
                                    ),
                                    child: Text(
                                      isSearching ? 'SEARCHING' : (isNoDriver ? 'CONCLUDED' : status),
                                      style: TextStyle(
                                        color: isSearching ? AppColors.primary : (isNoDriver ? AppColors.warning : AppColors.slate500),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildTelemetryCell(
                                      title: 'POSTED AT',
                                      value: _formatDateTime(searchStartedAt),
                                      icon: Icons.access_time_rounded,
                                      isDark: isDark,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _buildTelemetryCell(
                                      title: 'ACTIVE DURATION',
                                      value: _formatDuration(searchDurationMinutes),
                                      icon: Icons.timelapse_rounded,
                                      isDark: isDark,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                children: [
                                  Expanded(
                                    child: _buildTelemetryCell(
                                      title: isSearching ? 'SEARCH STATUS' : 'STOPPED AT',
                                      value: isSearching ? 'Active Searching' : _formatDateTime(searchEndedAt),
                                      icon: isSearching ? Icons.radar_rounded : Icons.stop_circle_outlined,
                                      isDark: isDark,
                                      valueColor: isSearching ? AppColors.primary : null,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _buildTelemetryCell(
                                      title: 'DRIVERS CONTACTED',
                                      value: '$driversApproachedCount in Waves',
                                      icon: Icons.group_outlined,
                                      isDark: isDark,
                                      valueColor: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Route Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Route Details',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.my_location_rounded, size: 18, color: AppColors.primary),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Pickup', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                        Text(pickup, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.pin_drop_rounded, size: 18, color: AppColors.accentPurple),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Destination', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                        Text(drop, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isBidding ? 'Target Budget' : 'Rate per Vehicle',
                                    style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                  ),
                                  Text(
                                    '₹ ${budget.toStringAsFixed(0)}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                                  ),
                                ],
                              ),
                              if (!isBidding && req['zonalQuote'] is Map) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Row(
                                          children: [
                                            const Icon(Icons.verified_rounded, size: 14, color: AppColors.primary),
                                            const SizedBox(width: 6),
                                            Flexible(
                                              child: Text(
                                                'Corporate Zonal · ${req['zonalQuote']?['locality']?['zoneLabel'] ?? ''} · ${req['zonalQuote']?['officeHub']?['displayName'] ?? ''}',
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        'Rate ${req['zonalQuote']?['rateVersion'] ?? ''}${req['zonalQuote']?['hasEscort'] == true ? ' · Escort' : ''}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: isDark ? AppColors.accentGreenLight : AppColors.success,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Assigned Drivers Section (Live Real-time Dispatch)
                        if (assignedDrivers.isNotEmpty) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Assigned Drivers (${assignedDrivers.length})',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '${assignedDrivers.length} / $requiredQty Assigned',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: assignedDrivers.length >= requiredQty ? AppColors.success : AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: assignedDrivers.length,
                            itemBuilder: (context, index) {
                              final d = assignedDrivers[index];
                              if (d is! Map) return const SizedBox.shrink();
                              final driverName = d['driverName']?.toString() ?? 'Verified Driver';
                              final driverPhone = d['driverPhone']?.toString() ?? '—';
                              final vehiclePlate = d['vehiclePlate']?.toString() ?? '—';
                              final rawStatus = (d['tripStatus']?.toString() ?? 'ASSIGNED');
                              final tripStatus = rawStatus.replaceAll('_', ' ');
                              final tripId = d['tripId']?.toString();
                              final startOtp = d['startOtp']?.toString();

                              final isArrived = rawStatus == 'ARRIVED';
                              final isInProgress = rawStatus == 'IN_PROGRESS';
                              final isCompleted = rawStatus == 'COMPLETED';

                              Color badgeColor = AppColors.primary;
                              if (isArrived) badgeColor = AppColors.warning;
                              if (isInProgress) badgeColor = AppColors.info;
                              if (isCompleted) badgeColor = AppColors.success;

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(AppSpacing.md),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isArrived
                                        ? AppColors.warning.withValues(alpha: 0.6)
                                        : isCompleted
                                            ? AppColors.success.withValues(alpha: 0.5)
                                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                    width: isArrived ? 1.5 : 1.0,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: (isArrived ? AppColors.warning : Colors.black).withValues(alpha: isDark ? 0.2 : 0.06),
                                      blurRadius: 10,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Driver header
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                                          child: const Icon(Icons.person, color: AppColors.primary),
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
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  const Icon(Icons.verified, size: 14, color: AppColors.primary),
                                                ],
                                              ),
                                              Text(
                                                'Phone: $driverPhone • Plate: $vehiclePlate',
                                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: badgeColor.withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(AppRadius.xs),
                                            border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                                          ),
                                          child: Text(
                                            tripStatus,
                                            style: TextStyle(color: badgeColor, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),

                                    // Driver Arrival Alert Banner
                                    if (isArrived) ...[
                                      const SizedBox(height: 10),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: AppColors.warning.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(AppRadius.sm),
                                          border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                                        ),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.location_on, size: 16, color: AppColors.warning),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                'Driver has arrived at your pickup spot! Share the Start OTP below.',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark ? AppColors.textPrimaryDark : AppColors.slate900,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],

                                    // Start Ride OTP Box (Shown before completion if OTP exists)
                                    if (!isCompleted && startOtp != null && startOtp.isNotEmpty) ...[
                                      const SizedBox(height: 10),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            colors: [
                                              AppColors.primary.withValues(alpha: 0.12),
                                              AppColors.accentPurple.withValues(alpha: 0.08),
                                            ],
                                          ),
                                          borderRadius: BorderRadius.circular(AppRadius.md),
                                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              children: [
                                                const Icon(Icons.lock_outline_rounded, size: 18, color: AppColors.primary),
                                                const SizedBox(width: 8),
                                                Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      'Ride Start OTP',
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                        letterSpacing: 0.5,
                                                      ),
                                                    ),
                                                    Text(
                                                      'Give to driver at pickup',
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                            InkWell(
                                              onTap: () {
                                                Clipboard.setData(ClipboardData(text: startOtp));
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  const SnackBar(
                                                    content: Text('Start OTP copied to clipboard!'),
                                                    duration: Duration(seconds: 2),
                                                  ),
                                                );
                                              },
                                              borderRadius: BorderRadius.circular(AppRadius.sm),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary,
                                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: AppColors.primary.withValues(alpha: 0.3),
                                                      blurRadius: 6,
                                                    ),
                                                  ],
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Text(
                                                      startOtp,
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontWeight: FontWeight.w900,
                                                        fontSize: 16,
                                                        letterSpacing: 2,
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
                                    ],

                                    const SizedBox(height: 10),

                                    // Action Buttons Row
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () {
                                              if (tripId != null && tripId.isNotEmpty) {
                                                context.push('${AppRoutes.userActiveTripScreen}?id=$tripId');
                                              } else {
                                                context.push(AppRoutes.userActiveTripScreen);
                                              }
                                            },
                                            icon: const Icon(Icons.map_outlined, size: 16),
                                            label: Text(
                                              isInProgress ? 'Track Live Ride' : 'Trip Details',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                            ),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: AppColors.primary,
                                              side: const BorderSide(color: AppColors.primary),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                                              padding: const EdgeInsets.symmetric(vertical: 8),
                                            ),
                                          ),
                                        ),
                                        if (isCompleted && tripId != null) ...[
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              onPressed: () {
                                                TripRatingBottomSheet.show(
                                                  context: context,
                                                  tripId: tripId,
                                                  targetName: driverName,
                                                  vehicleInfo: vehiclePlate,
                                                  isReviewingDriver: true,
                                                  onReviewSubmitted: () => _loadRequirement(silent: true),
                                                );
                                              },
                                              icon: const Icon(Icons.star_rounded, size: 16, color: Colors.white),
                                              label: const Text(
                                                'Rate Driver ⭐',
                                                style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                              ),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppColors.starAmber,
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                                                padding: const EdgeInsets.symmetric(vertical: 8),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // Approached Drivers Section (All dispatch waves)
                        _buildApproachedDriversSection(
                          offers: offers,
                          isDark: isDark,
                          isSearching: isSearching,
                          isNoDriver: isNoDriver,
                        ),

                        // Competing Driver Bids Section (For Outstation Bidding Mode)
                        if (isBidding) ...[
                          const SizedBox(height: AppSpacing.md),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Driver Quotes (${bids.length})',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (bids.isNotEmpty)
                                TextButton(
                                  onPressed: () {
                                    showModalBottomSheet(
                                      context: context,
                                      useRootNavigator: true,
                                      isScrollControlled: true,
                                      backgroundColor: Colors.transparent,
                                      builder: (ctx) => UserBidsBottomSheet(
                                        requirementId: rawId,
                                        onBidAccepted: () => _loadRequirement(silent: false),
                                      ),
                                    );
                                  },
                                  child: const Text('Review All Quotes'),
                                ),
                            ],
                          ),
                          if (bids.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(AppSpacing.lg),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.gavel_rounded, size: 32, color: AppColors.slate400),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No driver bids received yet',
                                    style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Broadcasted to verified drivers in the region. Quotes will appear here automatically.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                  ),
                                ],
                              ),
                            )
                          else
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: bids.length,
                              itemBuilder: (context, index) {
                                final b = bids[index];
                                if (b is! Map) return const SizedBox.shrink();
                                final bidAmount = _parseNum(b['bidAmount']).toDouble();
                                final driverName = b['driverName']?.toString() ?? 'Driver Partner';
                                final rating = _parseNum(b['driverRating'], 4.9).toDouble();
                                final eta = b['etaMinutes']?.toString() ?? '15';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(driverName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                            Row(
                                              children: [
                                                const Icon(Icons.star, size: 14, color: AppColors.starAmber),
                                                const SizedBox(width: 2),
                                                Text('$rating', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                Text(' • $eta mins ETA', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text('₹ ${bidAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
                                          const SizedBox(height: 4),
                                          ElevatedButton(
                                            onPressed: () async {
                                              final messenger = ScaffoldMessenger.of(context);
                                              try {
                                                await UserService.instance.acceptBid(b['id'].toString());
                                                _loadRequirement(silent: false);
                                              } catch (e) {
                                                if (mounted) {
                                                  messenger.showSnackBar(
                                                    SnackBar(content: Text('Failed to accept quote: $e'), backgroundColor: AppColors.error),
                                                  );
                                                }
                                              }
                                            },
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.primary,
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                              minimumSize: Size.zero,
                                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                            ),
                                            child: const Text('Accept Bid', style: TextStyle(fontSize: 11, color: Colors.white)),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                        ],

                        const SizedBox(height: AppSpacing.xl),

                        // Bottom Actions
                        if (isSearching) ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _confirmCancelRequirement(context, rawId),
                                  icon: const Icon(Icons.stop_circle_outlined, size: 18, color: AppColors.error),
                                  label: const Text(
                                    'Cancel Search',
                                    style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: AppColors.error),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () => context.go(AppRoutes.userRequirementsScreen),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  ),
                                  child: const Text('All Bookings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                        ] else if (isNoDriver) ...[
                          Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _confirmCancelRequirement(context, rawId),
                                      icon: const Icon(Icons.cancel_outlined, size: 16, color: AppColors.error),
                                      label: const Text('Cancel Req.', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: AppColors.error),
                                        padding: const EdgeInsets.symmetric(vertical: 14),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    flex: 2,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _handleRetryDispatch(context, rawId),
                                      icon: const Icon(Icons.bolt_rounded, size: 18, color: Colors.white),
                                      label: const Text('Retry Dispatch Waves', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        padding: const EdgeInsets.symmetric(vertical: 14),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton(
                                  onPressed: () => context.go(AppRoutes.userRequirementsScreen),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  ),
                                  child: Text(
                                    'Back to All Requirements',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          AppPrimaryButton(
                            text: 'Back to All Requirements',
                            onPressed: () => context.go(AppRoutes.userRequirementsScreen),
                          ),
                        ],
                      ],
                    ),
                  ),
      ),
    );
  }
}

