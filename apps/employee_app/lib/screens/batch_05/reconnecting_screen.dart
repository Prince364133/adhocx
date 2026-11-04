import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_05_illustrations.dart';
import '../../services/mock_data_service.dart';

/// Screen 12: Reconnecting...
class ReconnectingScreen extends StatefulWidget {
  const ReconnectingScreen({super.key});

  @override
  State<ReconnectingScreen> createState() => _ReconnectingScreenState();
}

class _ReconnectingScreenState extends State<ReconnectingScreen> {
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
        _exception = exceptions?['reconnecting'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _exception?['title'] ?? 'Reconnecting...';
    final message = _exception?['message'] ??
        'Trying to restore live tracking for your trip.';

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
                    const SizedBox(height: 36),
                    const ReconnectingSpinnerGraphic(),
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
                    const SizedBox(height: 36),

                    // Progress bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: const LinearProgressIndicator(
                        minHeight: 6,
                        backgroundColor: Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryBlue),
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
