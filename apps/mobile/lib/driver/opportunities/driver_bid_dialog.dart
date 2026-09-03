import 'package:flutter/material.dart';
import '../../services/driver_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class DriverBidDialog extends StatefulWidget {
  final String requirementId;
  final String pickupAddress;
  final String dropAddress;
  final double suggestedBudget;
  final String vehicleType;

  const DriverBidDialog({
    super.key,
    required this.requirementId,
    required this.pickupAddress,
    required this.dropAddress,
    required this.suggestedBudget,
    required this.vehicleType,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String requirementId,
    required String pickupAddress,
    required String dropAddress,
    required double suggestedBudget,
    required String vehicleType,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DriverBidDialog(
        requirementId: requirementId,
        pickupAddress: pickupAddress,
        dropAddress: dropAddress,
        suggestedBudget: suggestedBudget,
        vehicleType: vehicleType,
      ),
    );
  }

  @override
  State<DriverBidDialog> createState() => _DriverBidDialogState();
}

class _DriverBidDialogState extends State<DriverBidDialog> {
  late final TextEditingController _amountController;
  final TextEditingController _etaController = TextEditingController(text: '20');
  final TextEditingController _notesController = TextEditingController();

  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(text: widget.suggestedBudget.toInt().toString());
  }

  @override
  void dispose() {
    _amountController.dispose();
    _etaController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitBid() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Please enter a valid bid amount');
      return;
    }

    final eta = int.tryParse(_etaController.text.trim()) ?? 20;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await DriverService.instance.submitBid(
        requirementId: widget.requirementId,
        bidAmount: amount,
        etaMinutes: eta,
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bid of ₹${amount.toInt()} submitted successfully!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.md + bottomInset),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6C5CE7).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: const Icon(Icons.gavel_rounded, color: Color(0xFF6C5CE7), size: 24),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Submit Reverse Bid',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Outstation Long-Distance Booking',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // Route Info Card
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: isDark ? AppColors.bgDark : AppColors.bgLight,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.circle, color: Color(0xFF10B981), size: 12),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.pickupAddress,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.circle, color: Color(0xFFEF4444), size: 12),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.dropAddress,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Base Budget Floor Info
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Suggested Budget Floor:',
                  style: TextStyle(fontSize: 13, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                ),
                Text(
                  '₹${widget.suggestedBudget.toInt()}',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF6C5CE7)),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // Bid Amount Input
            Text(
              'Your Bid Amount (₹) *',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: isDark ? Colors.white : Colors.black),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                prefixText: '₹ ',
                prefixStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF6C5CE7)),
                hintText: 'Enter your price',
                filled: true,
                fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Pickup ETA in Minutes
            Text(
              'Pickup ETA (Minutes) *',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: isDark ? Colors.white : Colors.black),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _etaController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                suffixText: 'mins',
                hintText: 'e.g. 15',
                filled: true,
                fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Quick Notes
            Text(
              'Driver Notes / Vehicle Highlights (Optional)',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: isDark ? Colors.white : Colors.black),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'e.g. Well maintained AC sedan, sanitized interior, experienced highway driver',
                filled: true,
                fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                _error!,
                style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],

            const SizedBox(height: AppSpacing.lg),
            AppPrimaryButton(
              text: _loading ? 'Submitting Bid...' : 'Place Competitive Bid',
              onPressed: _loading ? null : _submitBid,
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }
}
