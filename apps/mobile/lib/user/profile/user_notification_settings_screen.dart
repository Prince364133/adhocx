import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserNotificationSettingsScreen extends StatefulWidget {
  const UserNotificationSettingsScreen({super.key});

  @override
  State<UserNotificationSettingsScreen> createState() => _UserNotificationSettingsScreenState();
}

class _UserNotificationSettingsScreenState extends State<UserNotificationSettingsScreen> {
  bool _isLoading = true;

  // Channels
  bool _pushEnabled = true;
  bool _emailEnabled = true;
  bool _smsEnabled = true;
  bool _whatsappEnabled = true;

  // Booking & Requirements
  bool _newBids = true;
  bool _driverAssignments = true;
  bool _fulfillmentUpdates = true;
  bool _noDriverAlerts = true;

  // Trips
  bool _tripAlerts = true;
  bool _driverEnRoute = true;
  bool _vehicleArrived = true;
  bool _tripCompleted = true;
  bool _tripCancellation = true;

  // Payments & Invoices
  bool _paymentSuccess = true;
  bool _lowBalanceWarning = true;
  bool _invoiceGenerated = true;

  // Promotions & Marketing
  bool _marketingPromos = false;

  // Quiet Hours
  bool _quietHoursEnabled = false;
  String _quietHoursStart = '22:00';
  String _quietHoursEnd = '07:00';

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await UserService.instance.getNotificationPreferences();
      if (mounted) {
        setState(() {
          if (prefs.containsKey('pushEnabled')) _pushEnabled = prefs['pushEnabled'] == true;
          if (prefs.containsKey('emailEnabled')) _emailEnabled = prefs['emailEnabled'] == true;
          if (prefs.containsKey('smsEnabled')) _smsEnabled = prefs['smsEnabled'] == true;
          if (prefs.containsKey('whatsappEnabled')) _whatsappEnabled = prefs['whatsappEnabled'] == true;
          if (prefs.containsKey('tripAlerts')) _tripAlerts = prefs['tripAlerts'] == true;
          if (prefs.containsKey('marketingPromos')) _marketingPromos = prefs['marketingPromos'] == true;
          if (prefs['quietHoursStart'] != null) {
            _quietHoursEnabled = true;
            _quietHoursStart = prefs['quietHoursStart'].toString();
          }
          if (prefs['quietHoursEnd'] != null) {
            _quietHoursEnd = prefs['quietHoursEnd'].toString();
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _syncPreferences() async {
    try {
      final payload = {
        'pushEnabled': _pushEnabled,
        'emailEnabled': _emailEnabled,
        'smsEnabled': _smsEnabled,
        'tripAlerts': _tripAlerts,
        'marketingPromos': _marketingPromos,
        if (_quietHoursEnabled) 'quietHoursStart': _quietHoursStart,
        if (_quietHoursEnabled) 'quietHoursEnd': _quietHoursEnd,
      };

      await UserService.instance.updateNotificationPreferences(payload);
    } catch (_) {
      // Background sync; silent fallback
    }
  }

  void _onToggle(VoidCallback update) {
    setState(update);
    _syncPreferences();
    Fluttertoast.showToast(
      msg: 'Preferences updated',
      toastLength: Toast.LENGTH_SHORT,
      backgroundColor: AppColors.slate800,
      textColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
          'Notification Settings',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Delivery Channels
                    _buildSectionHeader('Delivery Channels', isDark),
                    const SizedBox(height: 6),
                    Container(
                      decoration: _cardBoxDecoration(isDark),
                      child: Column(
                        children: [
                          _buildSwitch(
                            title: 'Push Notifications',
                            subtitle: 'Instant alerts on mobile screen for vehicle arrivals & updates',
                            icon: Icons.notifications_active_outlined,
                            val: _pushEnabled,
                            onChanged: (v) => _onToggle(() => _pushEnabled = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'SMS Alerts',
                            subtitle: 'Security OTPs and driver contact details sent to registered phone',
                            icon: Icons.sms_outlined,
                            val: _smsEnabled,
                            onChanged: (v) => _onToggle(() => _smsEnabled = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'WhatsApp Updates',
                            subtitle: 'Live trip tracking link & driver itinerary sent via WhatsApp',
                            icon: Icons.chat_outlined,
                            val: _whatsappEnabled,
                            onChanged: (v) => _onToggle(() => _whatsappEnabled = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Email Reports & Invoices',
                            subtitle: 'Automated GST invoices, trip receipts and monthly account statements',
                            icon: Icons.email_outlined,
                            val: _emailEnabled,
                            onChanged: (v) => _onToggle(() => _emailEnabled = v),
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Corporate Booking & Requirements
                    _buildSectionHeader('Corporate Bookings & Dispatch', isDark),
                    const SizedBox(height: 6),
                    Container(
                      decoration: _cardBoxDecoration(isDark),
                      child: Column(
                        children: [
                          _buildSwitch(
                            title: 'New Bids & Quotes',
                            subtitle: 'When fleet operators and drivers submit competitive bids',
                            icon: Icons.gavel_outlined,
                            val: _newBids,
                            onChanged: (v) => _onToggle(() => _newBids = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Driver Assignments',
                            subtitle: 'When a verified vehicle and driver are assigned to your trip',
                            icon: Icons.person_pin_circle_outlined,
                            val: _driverAssignments,
                            onChanged: (v) => _onToggle(() => _driverAssignments = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Fulfillment Milestones',
                            subtitle: 'Status updates as requirements transition towards completion',
                            icon: Icons.task_alt_outlined,
                            val: _fulfillmentUpdates,
                            onChanged: (v) => _onToggle(() => _fulfillmentUpdates = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'No Driver Available Alerts',
                            subtitle: 'Urgent notification if automatic dispatch needs tariff review',
                            icon: Icons.warning_amber_outlined,
                            val: _noDriverAlerts,
                            onChanged: (v) => _onToggle(() => _noDriverAlerts = v),
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Live Trips
                    _buildSectionHeader('Live Trip Telemetry', isDark),
                    const SizedBox(height: 6),
                    Container(
                      decoration: _cardBoxDecoration(isDark),
                      child: Column(
                        children: [
                          _buildSwitch(
                            title: 'Driver En Route',
                            subtitle: 'Driver has started heading toward the pickup campus',
                            icon: Icons.directions_car_outlined,
                            val: _driverEnRoute,
                            onChanged: (v) => _onToggle(() => _driverEnRoute = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Vehicle Arrived at Gate',
                            subtitle: 'Driver reached pickup gate and is ready for boarding',
                            icon: Icons.near_me_outlined,
                            val: _vehicleArrived,
                            onChanged: (v) => _onToggle(() => _vehicleArrived = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Trip Completed & Fare Receipts',
                            subtitle: 'Journey safely concluded with final odometer readings',
                            icon: Icons.check_circle_outline,
                            val: _tripCompleted,
                            onChanged: (v) => _onToggle(() => _tripCompleted = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Trip Cancellations & Deviations',
                            subtitle: 'Alerts if a passenger cancels or unexpected detour occurs',
                            icon: Icons.cancel_outlined,
                            val: _tripCancellation,
                            onChanged: (v) => _onToggle(() => _tripCancellation = v),
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Invoicing & Wallet
                    _buildSectionHeader('Billing & Financial Statements', isDark),
                    const SizedBox(height: 6),
                    Container(
                      decoration: _cardBoxDecoration(isDark),
                      child: Column(
                        children: [
                          _buildSwitch(
                            title: 'Payment Confirmations',
                            subtitle: 'Receipts on successful wallet top-up or automated escrow debit',
                            icon: Icons.payments_outlined,
                            val: _paymentSuccess,
                            onChanged: (v) => _onToggle(() => _paymentSuccess = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Low Balance Warning',
                            subtitle: 'Alert when corporate prepaid balance is insufficient for scheduled rides',
                            icon: Icons.account_balance_wallet_outlined,
                            val: _lowBalanceWarning,
                            onChanged: (v) => _onToggle(() => _lowBalanceWarning = v),
                            isDark: isDark,
                          ),
                          const Divider(height: 1),
                          _buildSwitch(
                            title: 'Monthly GST Tax Invoices',
                            subtitle: 'Notification as soon as monthly B2B tax invoice is finalized',
                            icon: Icons.receipt_long_outlined,
                            val: _invoiceGenerated,
                            onChanged: (v) => _onToggle(() => _invoiceGenerated = v),
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Quiet Hours / Do Not Disturb
                    _buildSectionHeader('Quiet Hours & Do Not Disturb', isDark),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      decoration: _cardBoxDecoration(isDark),
                      child: Column(
                        children: [
                          _buildSwitch(
                            title: 'Enable Quiet Hours',
                            subtitle: 'Silence marketing and non-urgent notifications during selected hours',
                            icon: Icons.bedtime_outlined,
                            val: _quietHoursEnabled,
                            onChanged: (v) => _onToggle(() => _quietHoursEnabled = v),
                            isDark: isDark,
                          ),
                          if (_quietHoursEnabled) ...[
                            const Divider(height: 1),
                            Padding(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Quiet Schedule: $_quietHoursStart - $_quietHoursEnd',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: const Text(
                                      '10 PM to 7 AM',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Note: Critical passenger safety SOS alerts and live driver arrival alerts are always delivered immediately regardless of Quiet Hours.',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                  ],
                ),
              ),
      ),
    );
  }

  BoxDecoration _cardBoxDecoration(bool isDark) {
    return BoxDecoration(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Text(
      title,
      style: AppTypography.caption(
        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildSwitch({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool val,
    required ValueChanged<bool> onChanged,
    required bool isDark,
  }) {
    return SwitchListTile(
      secondary: Icon(icon, color: AppColors.primary, size: 22),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 11,
          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
        ),
      ),
      value: val,
      onChanged: onChanged,
      activeThumbColor: AppColors.primary,
    );
  }
}
