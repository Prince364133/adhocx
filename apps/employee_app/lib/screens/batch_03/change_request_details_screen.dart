import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_primary_button.dart';
import '../../routes/app_routes.dart';

class ChangeRequestDetailsScreen extends StatefulWidget {
  const ChangeRequestDetailsScreen({super.key});

  @override
  State<ChangeRequestDetailsScreen> createState() => _ChangeRequestDetailsScreenState();
}

class _ChangeRequestDetailsScreenState extends State<ChangeRequestDetailsScreen> {
  final TextEditingController _reasonController = TextEditingController(
    text: 'Temporary change due to home renovation',
  );
  String _address = 'Flat 402, Green Meadows, Kondapur, Hyderabad';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    if (mounted) {
      setState(() {
        _address = profile['homeAddress'] ?? 'Flat 402, Green Meadows, Kondapur, Hyderabad';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Text(
                  'Change Pickup Location',
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),

              const SizedBox(height: 28),

              Text(
                'New Pickup Location',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 10),

              // Location Selector Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.location_on_rounded, color: AppColors.primaryBlue, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _address,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          height: 1.4,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 22),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              Text(
                'Reason (Optional)',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 10),

              // Reason Textarea
              TextField(
                controller: _reasonController,
                maxLines: 4,
                maxLength: 200,
                style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Enter reason for change...',
                  counterStyle: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                  filled: true,
                  fillColor: AppColors.surfaceMuted,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primaryBlue, width: 1.5),
                  ),
                ),
              ),

              const SizedBox(height: 36),

              // Submit Request Button
              EmployeePrimaryButton(
                label: 'Submit Request',
                onPressed: () => context.push(AppRoutes.changeSubmitted),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
