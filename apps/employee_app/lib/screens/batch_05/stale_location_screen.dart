import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_05_illustrations.dart';
import '../../widgets/employee_primary_button.dart';
import '../../services/mock_data_service.dart';

/// Screen 10: Stale Location / Location May Be Outdated
class StaleLocationScreen extends StatefulWidget {
  const StaleLocationScreen({super.key});

  @override
  State<StaleLocationScreen> createState() => _StaleLocationScreenState();
}

class _StaleLocationScreenState extends State<StaleLocationScreen> {
  Map<String, dynamic>? _exception;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final tracking = await MockDataService.getLiveTracking();
    if (mounted) {
      final exceptions = tracking['exceptions'] as Map<String, dynamic>?;
      setState(() {
        _exception = exceptions?['stale_location'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _exception?['title'] ?? 'Location May Be Outdated';
    final message = _exception?['message'] ??
        "The cab's last known location was 2 min ago. We're attempting to get a fresh update.";

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 24),
                    const StaleLocationBadge(),
                    const SizedBox(height: 24),
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const Spacer(),

                    EmployeePrimaryButton(
                      label: 'Refresh',
                      icon: Icons.sync_rounded,
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Polling latest cab coordinates...')),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}

