import 'package:flutter/material.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

class DriverSubmitBidSheet extends StatefulWidget {
  final Map<String, dynamic> opportunity;

  const DriverSubmitBidSheet({
    super.key,
    required this.opportunity,
  });

  static Future<bool?> show(BuildContext context, {required Map<String, dynamic> opportunity}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DriverSubmitBidSheet(opportunity: opportunity),
    );
  }

  @override
  State<DriverSubmitBidSheet> createState() => _DriverSubmitBidSheetState();
}

class _DriverSubmitBidSheetState extends State<DriverSubmitBidSheet> {
  late TextEditingController _bidAmountController;
  late TextEditingController _etaController;
  late TextEditingController _notesController;
  int _selectedEta = 15;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final suggested = (widget.opportunity['suggestedBudget'] ?? widget.opportunity['offeredPrice'] ?? 3500) as num;
    _bidAmountController = TextEditingController(text: suggested.toInt().toString());
    _etaController = TextEditingController(text: '15');
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _bidAmountController.dispose();
    _etaController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitBid() async {
    final amount = double.tryParse(_bidAmountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _errorMessage = 'Please enter a valid bid amount');
      return;
    }

    final reqId = (widget.opportunity['requirementId'] ?? widget.opportunity['id']) as String?;
    if (reqId == null || reqId.isEmpty) {
      setState(() => _errorMessage = 'Invalid requirement ID');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await DriverService.instance.submitBid(
        requirementId: reqId,
        bidAmount: amount,
        etaMinutes: _selectedEta,
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Quote of ₹${amount.toInt()} submitted successfully! Vendor notified.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final op = widget.opportunity;
    final req = op['requirement'] as Map<String, dynamic>?;
    final vehicle = req?['vehicleType'] ?? op['vehicleType'] ?? 'Sedan';
    final pickup = req?['pickupAddress'] ?? op['pickup'] ?? op['pickupAddress'] ?? 'Pickup';
    final drop = req?['dropAddress'] ?? op['drop'] ?? op['dropAddress'] ?? 'Destination';
    final targetBudget = (op['suggestedBudget'] ?? op['offeredPrice'] ?? req?['budgetPerVehicle'] ?? 3500) as num;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle bar
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

              // Title
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: const Icon(Icons.gavel_rounded, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Submit Outstation Quote',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '$vehicle • Target Budget: ₹${targetBudget.toInt()}',
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
              const Divider(),
              const SizedBox(height: AppSpacing.sm),

              // Route Preview Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.bgDark : AppColors.bgLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            pickup,
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
                        const Icon(Icons.circle, size: 8, color: AppColors.error),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            drop,
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

              const SizedBox(height: AppSpacing.lg),

              // Custom Bid Amount Input
              Text(
                'Your Proposed Rate (₹) *',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _bidAmountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 22, color: AppColors.primary),
                  hintText: 'Enter your quote amount',
                  filled: true,
                  fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),

              const SizedBox(height: AppSpacing.sm),

              // Quick Quote Modifiers
              Row(
                children: [
                  _buildQuickModifierChip('-₹200', targetBudget.toDouble() - 200),
                  const SizedBox(width: 6),
                  _buildQuickModifierChip('Target ₹${targetBudget.toInt()}', targetBudget.toDouble()),
                  const SizedBox(width: 6),
                  _buildQuickModifierChip('+₹200', targetBudget.toDouble() + 200),
                  const SizedBox(width: 6),
                  _buildQuickModifierChip('+₹500', targetBudget.toDouble() + 500),
                ],
              ),

              const SizedBox(height: AppSpacing.lg),

              // Estimated ETA
              Text(
                'Pickup ETA *',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [10, 15, 25, 45, 60].map((mins) {
                  final isSel = _selectedEta == mins;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                      child: OutlinedButton(
                        onPressed: () => setState(() => _selectedEta = mins),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          backgroundColor: isSel ? AppColors.primary.withValues(alpha: 0.15) : null,
                          side: BorderSide(
                            color: isSel ? AppColors.primary : (isDark ? AppColors.borderDark : AppColors.borderLight),
                            width: isSel ? 2 : 1,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
                        ),
                        child: Text(
                          '$mins m',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                            color: isSel ? AppColors.primary : null,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Driver Pitch / Notes
              Text(
                'Driver Notes (Optional)',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'e.g. Clean sedan, roof luggage carrier, toll included',
                  hintStyle: const TextStyle(fontSize: 12),
                  filled: true,
                  fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(_errorMessage!, style: const TextStyle(color: AppColors.error, fontSize: 12)),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: AppSpacing.xl),

              // Submit Button
              AppPrimaryButton(
                text: '⚡ Submit Competitive Quote',
                isLoading: _isSubmitting,
                onPressed: _submitBid,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickModifierChip(String label, double amount) {
    return Expanded(
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
        padding: EdgeInsets.zero,
        onPressed: () {
          setState(() {
            _bidAmountController.text = amount.toInt().toString();
          });
        },
      ),
    );
  }
}
