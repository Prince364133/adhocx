import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_05_illustrations.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';

/// Screen 7: Trip Progress (On Trip)
class TripProgressOnTripScreen extends StatefulWidget {
  const TripProgressOnTripScreen({super.key});

  @override
  State<TripProgressOnTripScreen> createState() => _TripProgressOnTripScreenState();
}

class _TripProgressOnTripScreenState extends State<TripProgressOnTripScreen> {
  Map<String, dynamic>? _progressData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final tracking = await MockDataService.getLiveTracking();
    if (mounted) {
      setState(() {
        _progressData = tracking['tripProgress'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _progressData?['title'] ?? 'Trip in Progress';
    final headline = _progressData?['headline'] ?? 'En Route to Office';
    final eta = _progressData?['eta'] ?? '18 min';
    final distance = _progressData?['distance'] ?? '7.6 km';

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
          title,
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
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  children: [
                    // Live Map Canvas
                    VectorLiveMapCanvas(
                      height: 240,
                      etaBadge: 'ETA $eta',
                      showControls: true,
                    ),
                    const SizedBox(height: 20),

                    // En Route Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            headline,
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'ETA $eta • $distance',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryBlue,
                            ),
                          ),
                          const SizedBox(height: 24),

                          // 4-step progress: Pickup, Boarded, In Progress, Drop
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildStepIndicator('Pickup', isDone: true, isActive: false),
                              _buildLineConnector(isDone: true),
                              _buildStepIndicator('Boarded', isDone: true, isActive: false),
                              _buildLineConnector(isDone: true),
                              _buildStepIndicator('In Progress', isDone: false, isActive: true),
                              _buildLineConnector(isDone: false),
                              _buildStepIndicator('Drop', isDone: false, isActive: false),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStepIndicator(String label, {required bool isDone, required bool isActive}) {
    Color bg = const Color(0xFFE2E8F0);
        if (isDone) {
      bg = AppColors.success;
          } else if (isActive) {
      bg = AppColors.primaryBlue;
          }

    return Column(
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: bg,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check, size: 14, color: Colors.white)
                : isActive
                    ? Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      )
                    : null,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isActive || isDone ? FontWeight.w700 : FontWeight.w500,
            color: isActive ? AppColors.primaryBlue : isDone ? AppColors.textPrimary : AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildLineConnector({required bool isDone}) {
    return Expanded(
      child: Container(
        height: 2.5,
        margin: const EdgeInsets.only(bottom: 20),
        color: isDone ? AppColors.success : const Color(0xFFE2E8F0),
      ),
    );
  }
}



