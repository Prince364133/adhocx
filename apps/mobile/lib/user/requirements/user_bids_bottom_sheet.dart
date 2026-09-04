import 'package:flutter/material.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserBidsBottomSheet extends StatefulWidget {
  final String requirementId;

  const UserBidsBottomSheet({
    super.key,
    required this.requirementId,
  });

  static Future<bool?> show(BuildContext context, {required String requirementId}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => UserBidsBottomSheet(requirementId: requirementId),
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
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bid of ₹${amount.toInt()} accepted! Escrow hold locked and driver assigned.'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _acceptingBidId = null);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: const Color(0xFFEF4444),
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
                color: isDark ? Colors.grey[700] : Colors.grey[300],
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
                : _bids.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.gavel_outlined, size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            Text(
                              'No bids received yet',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Nearby verified drivers have been alerted to quote',
                              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
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
                                    ? const Color(0xFF10B981)
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
                                            const Icon(Icons.star, color: Colors.amber, size: 14),
                                            const SizedBox(width: 2),
                                            Text(
                                              driverRating.toStringAsFixed(1),
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: (trustScore >= 90 ? const Color(0xFF10B981) : Colors.orange)
                                                    .withValues(alpha: 0.15),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                '${trustScore.toStringAsFixed(0)}% Trust',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: trustScore >= 90 ? const Color(0xFF10B981) : Colors.orange,
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
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF6C5CE7),
                                          ),
                                        ),
                                        Text(
                                          'ETA $eta mins',
                                          style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.directions_car_outlined, size: 14, color: Colors.grey),
                                    const SizedBox(width: 4),
                                    Text(
                                      '$vehicleModel • $vehiclePlate',
                                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
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
                                      color: isDark ? Colors.grey[400] : Colors.grey[700],
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),

                                if (isAccepted)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    child: const Center(
                                      child: Text(
                                        '✓ WINNING BID ACCEPTED',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF10B981),
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
                                        backgroundColor: const Color(0xFF6C5CE7),
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
