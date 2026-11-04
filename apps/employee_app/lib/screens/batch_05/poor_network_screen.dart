import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_05_illustrations.dart';
import '../../services/mock_data_service.dart';

/// Screen 11: Poor Network
class PoorNetworkScreen extends StatefulWidget {
  const PoorNetworkScreen({super.key});

  @override
  State<PoorNetworkScreen> createState() => _PoorNetworkScreenState();
}

class _PoorNetworkScreenState extends State<PoorNetworkScreen> {
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
        _exception = exceptions?['poor_network'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _exception?['title'] ?? 'Poor Network';
    final message = _exception?['message'] ??
        'Your internet connection is weak. Live updates may be delayed.';

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
                    const PoorNetworkBadge(),
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
                    const SizedBox(height: 32),

                    // Assurance checklist
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, size: 20, color: AppColors.success),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Trip is still active',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 24),
                          Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, size: 20, color: AppColors.success),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  "We'll sync once your connection improves",
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),
                  ],
                ),
              ),
            ),
    );
  }
}

