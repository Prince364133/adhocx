import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_07_illustrations.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';

/// Screen 12: Safety Tips & Guidelines
class SafetyTipsGuidelinesScreen extends StatefulWidget {
  const SafetyTipsGuidelinesScreen({super.key});

  @override
  State<SafetyTipsGuidelinesScreen> createState() => _SafetyTipsGuidelinesScreenState();
}

class _SafetyTipsGuidelinesScreenState extends State<SafetyTipsGuidelinesScreen> {
  List<dynamic> _tips = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTips();
  }

  Future<void> _loadTips() async {
    final safety = await MockDataService.getSafetyData();
    if (mounted) {
      setState(() {
        _tips = safety['safety_tips'] as List<dynamic>? ?? [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Safety Tips',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const SafetyCenterShieldBadge(),
                    const SizedBox(height: 20),
                    Text(
                      'Travel Safely with AdhocX',
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Guidelines Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: List.generate(_tips.length, (index) {
                          final tip = _tips[index].toString();
                          final isLast = index == _tips.length - 1;
                          return Column(
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Text(
                                      tip,
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimary,
                                        height: 1.4,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (!isLast) const Divider(height: 24),
                            ],
                          );
                        }),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}



