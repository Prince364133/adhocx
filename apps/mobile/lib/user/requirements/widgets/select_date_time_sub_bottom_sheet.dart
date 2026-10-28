import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';

class SelectDateTimeSubBottomSheet extends StatefulWidget {
  final String initialDate;
  final String initialTime;
  final DateTime? initialDateTime;

  const SelectDateTimeSubBottomSheet({
    super.key,
    this.initialDate = '',
    this.initialTime = '',
    this.initialDateTime,
  });

  @override
  State<SelectDateTimeSubBottomSheet> createState() => _SelectDateTimeSubBottomSheetState();
}

class _SelectDateTimeSubBottomSheetState extends State<SelectDateTimeSubBottomSheet> {
  late DateTime _selectedDate;
  late TimeOfDay _selectedTime;

  @override
  void initState() {
    super.initState();
    final now = widget.initialDateTime ?? DateTime.now().add(const Duration(hours: 2));
    _selectedDate = now;
    _selectedTime = TimeOfDay(hour: now.hour, minute: now.minute);

    // Try parsing initial date if provided
    if (widget.initialDate.isNotEmpty) {
      final parts = widget.initialDate.split('-');
      if (parts.length == 3) {
        final y = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final d = int.tryParse(parts[2]);
        if (y != null && m != null && d != null) {
          _selectedDate = DateTime(y, m, d);
        }
      }
    }

    if (widget.initialTime.isNotEmpty) {
      try {
        final isPm = widget.initialTime.toUpperCase().contains('PM');
        final isAm = widget.initialTime.toUpperCase().contains('AM');
        final clean = widget.initialTime.replaceAll(RegExp(r'[APMapm\s]'), '');
        final parts = clean.split(':');
        if (parts.length == 2) {
          int h = int.parse(parts[0]);
          final min = int.parse(parts[1]);
          if (isPm && h < 12) h += 12;
          if (isAm && h == 12) h = 0;
          _selectedTime = TimeOfDay(hour: h, minute: min);
        }
      } catch (_) {}
    }
  }

  String get _formattedDateString =>
      '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

  String get _formattedTimeString {
    final hour = _selectedTime.hour;
    final minute = _selectedTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${displayHour.toString().padLeft(2, '0')}:$minute $period';
  }

  DateTime get _fullDateTime => DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(now) ? now : _selectedDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  void _applyPreset(int minutesOffset) {
    final target = DateTime.now().add(Duration(minutes: minutesOffset));
    setState(() {
      _selectedDate = target;
      _selectedTime = TimeOfDay(hour: target.hour, minute: target.minute);
    });
  }

  void _applySpecificTime(int daysOffset, int hour, int minute) {
    final base = DateTime.now().add(Duration(days: daysOffset));
    setState(() {
      _selectedDate = DateTime(base.year, base.month, base.day);
      _selectedTime = TimeOfDay(hour: hour, minute: minute);
    });
  }

  void _confirmAndApply() {
    Navigator.pop(context, {
      'pickupDate': _formattedDateString,
      'pickupTime': _formattedTimeString,
      'reportingDateTime': _fullDateTime,
      'isScheduled': true,
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.slate700 : AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 22),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Select Date & Time',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'Close',
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pickers Row (Pickup Date & Pickup Time)
                  Text(
                    'Pickup Date *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: _pickDate,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.bgDark : AppColors.bgLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.primary),
                              const SizedBox(width: 10),
                              Text(
                                _formattedDateString,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          Icon(Icons.calendar_month, color: AppColors.primary, size: 20),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  Text(
                    'Pickup Time *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: _pickTime,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.bgDark : AppColors.bgLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.access_time_rounded, size: 18, color: AppColors.primary),
                              const SizedBox(width: 10),
                              Text(
                                _formattedTimeString,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          Icon(Icons.schedule, color: AppColors.primary, size: 20),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // Quick presets
                  Text(
                    'Quick Timing Presets',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.flash_on_rounded, size: 14, color: AppColors.warning),
                        label: const Text('ASAP (+30 mins)', style: TextStyle(fontSize: 11)),
                        onPressed: () => _applyPreset(30),
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.wb_twilight_rounded, size: 14, color: AppColors.primary),
                        label: const Text('Tonight (07:00 PM)', style: TextStyle(fontSize: 11)),
                        onPressed: () => _applySpecificTime(0, 19, 0),
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.nights_stay_rounded, size: 14, color: AppColors.accentPurple),
                        label: const Text('Late Night (11:00 PM)', style: TextStyle(fontSize: 11)),
                        onPressed: () => _applySpecificTime(0, 23, 0),
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.wb_sunny_rounded, size: 14, color: AppColors.accentGreen),
                        label: const Text('Tomorrow Morning (08:30 AM)', style: TextStyle(fontSize: 11)),
                        onPressed: () => _applySpecificTime(1, 8, 30),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.lg),

                  // 30-Second Pre-Dispatch Alert Notice
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.notifications_active_outlined, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Automated Driver Dispatch Guarantee',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                'AdhocX will automatically search and match drivers for your trip. You will receive an advance notification 30 seconds before dispatch begins.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Confirm button
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _confirmAndApply,
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: const Text('Confirm Schedule',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
