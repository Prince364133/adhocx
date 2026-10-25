import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserRaiseIssueScreen extends StatefulWidget {
  final String? tripId;
  const UserRaiseIssueScreen({super.key, this.tripId});

  @override
  State<UserRaiseIssueScreen> createState() => _UserRaiseIssueScreenState();
}

class _UserRaiseIssueScreenState extends State<UserRaiseIssueScreen> {
  String _selectedCategory = 'Corporate Ride Booking';
  final List<String> _categories = [
    'Corporate Ride Booking',
    'Billing, GST & Invoices',
    'Driver & Fleet Standards',
    'Company Account & Verification',
    'Pricing, Tariffs & Outstation Fares',
    'Technical / App Assistance',
    'Other General Query',
  ];

  String _selectedPriority = 'NORMAL';
  final List<Map<String, String>> _priorities = [
    {'id': 'NORMAL', 'label': 'Normal (Standard 24h SLA)'},
    {'id': 'HIGH', 'label': 'High (4h Priority Review)'},
    {'id': 'URGENT', 'label': 'Urgent (Immediate Ops Triage)'},
  ];

  final TextEditingController _subjectController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _contactPersonController = TextEditingController();
  final TextEditingController _contactPhoneController = TextEditingController();

  String? _selectedTripId;
  List<Map<String, dynamic>> _userTrips = [];
  bool _isLoadingTrips = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedTripId = widget.tripId;
    _initUserData();
    _fetchRecentTrips();
  }

  void _initUserData() {
    final user = AuthService.instance.currentUser;
    _contactPersonController.text = user?.fullName ?? '';
    final phone = user?.phone ?? '';
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 10 && digits.startsWith('91')) {
      _contactPhoneController.text = digits.substring(digits.length - 10);
    } else {
      _contactPhoneController.text = digits.length > 10 ? digits.substring(0, 10) : digits;
    }
  }

  Future<void> _fetchRecentTrips() async {
    try {
      final trips = await UserService.instance.getTrips();
      if (mounted) {
        setState(() {
          _userTrips = trips.whereType<Map<String, dynamic>>().toList();
          _isLoadingTrips = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingTrips = false);
    }
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _descController.dispose();
    _contactPersonController.dispose();
    _contactPhoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final subject = _subjectController.text.trim();
    final description = _descController.text.trim();

    if (subject.isEmpty) {
      Fluttertoast.showToast(msg: 'Please enter a query subject');
      return;
    }

    if (description.isEmpty) {
      Fluttertoast.showToast(msg: 'Please provide query details or issue description');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final user = AuthService.instance.currentUser;
      final companyName = user?.vendorProfile?['organizationName'] ?? user?.fullName ?? 'Corporate Booker';

      final rawPhone = _contactPhoneController.text.trim();
      final phoneDigits = rawPhone.replaceAll(RegExp(r'\D'), '');
      final formattedPhone = phoneDigits.isNotEmpty
          ? '+91${phoneDigits.length > 10 ? phoneDigits.substring(phoneDigits.length - 10) : phoneDigits}'
          : '';

      final res = await UserService.instance.submitSupportQuery(
        category: _selectedCategory,
        subject: subject,
        description: description,
        tripId: _selectedTripId != null && _selectedTripId != 'NONE' ? _selectedTripId : null,
        priority: _selectedPriority,
        companyName: companyName,
        contactPerson: _contactPersonController.text.trim(),
        contactPhone: formattedPhone,
        contactEmail: user?.email,
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Support ticket submitted to admin desk successfully!',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );

        final ticketId = (res is Map && res['id'] != null)
            ? res['id'].toString()
            : (res is Map && res['ticket'] is Map ? res['ticket']['id'].toString() : 'TKT-${DateTime.now().millisecondsSinceEpoch.toString().substring(6)}');

        final ticketData = {
          'id': ticketId,
          'category': _selectedCategory,
          'reason': '[$_selectedCategory] $subject',
          'subject': subject,
          'description': description,
          'status': 'OPEN',
          'createdAt': DateTime.now().toIso8601String(),
          'relatedTripId': _selectedTripId != 'NONE' ? _selectedTripId : null,
        };

        context.push(AppRoutes.userTicketDetailsOpenScreen, extra: ticketData);
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Failed to submit query: ${e.toString().replaceAll("Exception: ", "")}',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
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
          'Raise a Support Query',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Info Banner
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.support_agent_rounded, color: AppColors.primary, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Corporate Helpdesk & Dispatch Support',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            ),
                          ),
                          Text(
                            'Your query will be routed directly to the AdhocX operations admin panel for investigation.',
                            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Query Category
              Text(
                'Query Category *',
                style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                items: _categories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13))))
                    .toList(),
                onChanged: (val) => setState(() => _selectedCategory = val!),
                dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Priority Level
              Text(
                'Urgency / Priority Level',
                style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedPriority,
                items: _priorities
                    .map((p) => DropdownMenuItem(value: p['id']!, child: Text(p['label']!, style: const TextStyle(fontSize: 13))))
                    .toList(),
                onChanged: (val) => setState(() => _selectedPriority = val!),
                dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Associated Trip (Optional)
              Text(
                'Associated Trip (Optional)',
                style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedTripId ?? 'NONE',
                items: [
                  const DropdownMenuItem(
                    value: 'NONE',
                    child: Text('General Query (No specific trip)', style: TextStyle(fontSize: 13)),
                  ),
                  ..._userTrips.map((t) {
                    final tid = t['id']?.toString() ?? '';
                    final shortId = tid.length > 8 ? tid.substring(0, 8) : tid;
                    final pickup = t['pickupAddress']?.toString() ?? 'Pickup';
                    final label = 'Trip #$shortId - ${pickup.split(',').first}';
                    return DropdownMenuItem(
                      value: tid,
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13),
                      ),
                    );
                  }),
                ],
                onChanged: (val) => setState(() => _selectedTripId = val),
                dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  helperText: _isLoadingTrips ? 'Loading recent trips...' : 'Select if this issue relates to a specific booking',
                  helperStyle: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Query Subject
              Text(
                'Subject / Brief Summary *',
                style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _subjectController,
                style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                decoration: InputDecoration(
                  hintText: 'e.g. Need monthly consolidated GST invoice for Bangalore fleet',
                  hintStyle: const TextStyle(fontSize: 12, color: AppColors.slate400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Detailed Description
              Text(
                'Detailed Description & Context *',
                style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _descController,
                maxLines: 5,
                style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                decoration: InputDecoration(
                  hintText: 'Provide full details, error messages, date/time, or employee details to help our team assist you quickly.',
                  hintStyle: const TextStyle(fontSize: 12, color: AppColors.slate400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Contact Information for Followup
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Contact Person', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        const SizedBox(height: 4),
                        TextField(
                          controller: _contactPersonController,
                          style: TextStyle(fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          decoration: InputDecoration(
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Callback Phone', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        const SizedBox(height: 4),
                        TextField(
                          controller: _contactPhoneController,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(10),
                          ],
                          style: TextStyle(fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          decoration: InputDecoration(
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                            prefixIcon: Padding(
                              padding: const EdgeInsets.only(left: 10, right: 6),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '+91',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Container(
                                    width: 1,
                                    height: 14,
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ],
                              ),
                            ),
                            hintText: '98765 43210',
                            hintStyle: const TextStyle(fontSize: 12, color: AppColors.slate400),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xl),

              // Submit Button
              AppPrimaryButton(
                text: _isSubmitting ? 'Submitting to Admin Panel...' : 'Submit Support Ticket',
                onPressed: _isSubmitting ? null : _handleSubmit,
              ),
              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }
}
