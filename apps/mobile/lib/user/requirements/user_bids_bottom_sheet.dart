import 'package:flutter/material.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserBidsBottomSheet extends StatefulWidget {
  final String requirementId;
  final VoidCallback? onBidAccepted;

  const UserBidsBottomSheet({
    super.key,
    required this.requirementId,
    this.onBidAccepted,
  });

  static Future<bool?> show(BuildContext context, {required String requirementId, VoidCallback? onBidAccepted}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => UserBidsBottomSheet(requirementId: requirementId, onBidAccepted: onBidAccepted),
    );
  }

  @override
  State<UserBidsBottomSheet> createState() => _UserBidsBottomSheetState();
}

class _UserBidsBottomSheetState extends State<UserBidsBottomSheet> {
  List<dynamic> _bids = [];
  bool _loading = true;
  String? _acceptingBidId;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBids();
  }

  Future<void> _loadBids() async {
    setState(() => _loading = true);
    try {
      final data = await UserService.instance.getBids(widget.requirementId);
      if (mounted) {
        setState(() {
          _bids = data;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Failed to load driver quotes';
        });
      }
    }
  }

  Future<void> _acceptBid(String bidId, double amount) async {
    setState(() => _acceptingBidId = bidId);
    try {
      await UserService.instance.acceptBid(bidId);
      if (mounted) {
        widget.onBidAccepted?.call();
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bid of ₹${amount.toInt()} accepted! Escrow hold locked and driver assigned.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _acceptingBidId = null);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.slate700 : AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Incoming Driver Bids',
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${_bids.length} quotes submitted by verified drivers',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
              IconButton(
                onPressed: _loadBids,
                icon: const Icon(Icons.refresh, size: 20),
              ),
            ],
          ),
          const Divider(),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                            const SizedBox(height: 12),
                            Text(
                              _error!,
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.error),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _loadBids,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _bids.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.gavel_outlined, size: 48, color: AppColors.slate400),
                                const SizedBox(height: 12),
                                Text(
                                  'No bids received yet',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate600),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Nearby verified drivers have been alerted to quote',
                                  style: TextStyle(fontSize: 12, color: AppColors.slate500),
                                ),
                              ],
                            ),
                          )
                    : ListView.separated(
                        itemCount: _bids.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (ctx, i) {
                          final bid = _bids[i] is Map ? _bids[i] as Map : {};
                          final bidId = bid['id'] ?? '';
                          final amount = (bid['bidAmount'] as num?)?.toDouble() ?? 0.0;
                          final driverName = bid['driverName'] ?? 'Verified Driver';
                          final driverRating = (bid['driverRating'] as num?)?.toDouble() ?? 5.0;
                          final trustScore = (bid['driverTrustScore'] as num?)?.toDouble() ?? 100.0;
                          final vehicleModel = bid['vehicleModel'] ?? 'Sedan';
                          final vehiclePlate = bid['vehiclePlate'] ?? '';
                          final eta = bid['etaMinutes'] ?? 15;
                          final notes = bid['notes'] as String?;
                          final isAccepted = bid['status'] == 'ACCEPTED';
                          final isPending = bid['status'] == 'PENDING';

                          return Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.bgDark : AppColors.bgLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(
                                color: isAccepted
                                    ? AppColors.success
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                width: isAccepted ? 2 : 1,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          driverName,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                        Row(
                                          children: [
                                            const Icon(Icons.star, color: AppColors.starAmber, size: 14),
                                            const SizedBox(width: 2),
                                            Text(
                                              driverRating.toStringAsFixed(1),
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: (trustScore >= 90 ? AppColors.success : AppColors.warning)
                                                    .withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                '${trustScore.toStringAsFixed(0)}% Trust',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: trustScore >= 90 ? AppColors.success : AppColors.warning,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '₹${amount.toInt()}',
                                          style: TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        Text(
                                          'ETA $eta mins',
                                          style: TextStyle(fontSize: 11, color: AppColors.slate500),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.directions_car_outlined, size: 14, color: AppColors.slate400),
                                    const SizedBox(width: 4),
                                    Text(
                                      '$vehicleModel • $vehiclePlate',
                                      style: TextStyle(fontSize: 12, color: AppColors.slate600),
                                    ),
                                  ],
                                ),
                                if (notes != null && notes.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    '"$notes"',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontStyle: FontStyle.italic,
                                      color: isDark ? AppColors.slate400 : AppColors.slate700,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),

                                if (isAccepted)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    child: const Center(
                                      child: Text(
                                        '✓ WINNING BID ACCEPTED',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.success,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  )
                                else if (isPending)
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton(
                                      onPressed: _acceptingBidId != null
                                          ? null
                                          : () => _acceptBid(bidId, amount),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(AppRadius.md),
                                        ),
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                      ),
                                      child: _acceptingBidId == bidId
                                          ? const SizedBox(
                                              height: 16,
                                              width: 16,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                            )
                                          : const Text(
                                              'Accept Bid & Lock Escrow',
                                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
