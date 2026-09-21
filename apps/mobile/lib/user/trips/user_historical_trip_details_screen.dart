import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserHistoricalTripDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  const UserHistoricalTripDetailsScreen({super.key, this.trip});

  @override
  State<UserHistoricalTripDetailsScreen> createState() => _UserHistoricalTripDetailsScreenState();
}

class _UserHistoricalTripDetailsScreenState extends State<UserHistoricalTripDetailsScreen> {
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.trip != null) {
      _trip = widget.trip;
      _isLoading = false;
    } else {
      _loadTrip();
    }
  }

  Future<void> _loadTrip() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        setState(() => _trip = list.first as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = _trip ?? {};
    final status = (trip['status'] ?? 'COMPLETED').toString();
    final tripCode = trip['tripCode'] ?? trip['id'] ?? '—';

    final pickup = trip['pickupLocation'] as Map<String, dynamic>?;
    final drop = trip['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? '—';
    final dropAddr = drop?['address'] ?? '—';
    final fare = trip['agreedRate'] ?? trip['fare'] ?? trip['ratePerVehicle'] ?? 0;
    final driver = trip['driver'] as Map<String, dynamic>?;
    final vehicleModel = driver?['vehicleModel'] ?? trip['vehicleModel'] ?? trip['vehicleType'] ?? 'Commercial Fleet';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Trip Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Title & Completed Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$vehicleModel Trip', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            Text(tripCode.toString(), style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                          child: Text(status, style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Date & Route Box
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
                              const Icon(Icons.event, size: 16, color: AppColors.primary),
                              const SizedBox(width: 8),
                              Text('Trip Verified on Ledger', style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.circle, size: 8, color: AppColors.success),
                              const SizedBox(width: 8),
                              Expanded(child: Text(pickupAddr, style: const TextStyle(fontSize: 12))),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.circle, size: 8, color: AppColors.error),
                              const SizedBox(width: 8),
                              Expanded(child: Text(dropAddr, style: const TextStyle(fontSize: 12))),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Summary Box
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
                          Text('Summary', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          _buildRow(context, 'Vehicle Model', vehicleModel, isDark),
                          const Divider(),
                          _buildRow(context, 'Total Fare', '₹ $fare.00', isDark, isBold: true),
                          const Divider(),
                          _buildRow(context, 'Trip Status', status, isDark, isGreen: true),
                          const Divider(),
                          _buildRow(context, 'Payment Mode', 'AdhocX Escrow Wallet', isDark),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    OutlinedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Receipt downloaded & stored in wallet ledger')),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: const Text('View Ledger Receipt', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, String label, String value, bool isDark, {bool isBold = false, bool isGreen = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold || isGreen ? FontWeight.bold : FontWeight.w500,
              fontSize: 12,
              color: isGreen ? AppColors.success : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
            ),
          ),
        ],
      ),
    );
  }
}
