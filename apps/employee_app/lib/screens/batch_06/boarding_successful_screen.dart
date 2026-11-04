import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_06_illustrations.dart';
import '../../widgets/employee_primary_button.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 5: Boarding Successful
class BoardingSuccessfulScreen extends StatefulWidget {
  const BoardingSuccessfulScreen({super.key});

  @override
  State<BoardingSuccessfulScreen> createState() => _BoardingSuccessfulScreenState();
}

class _BoardingSuccessfulScreenState extends State<BoardingSuccessfulScreen> {
  Map<String, dynamic>? _confirmedData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final boarding = await MockDataService.getBoardingData();
    if (mounted) {
      setState(() {
        _confirmedData = boarding['boarding_confirmed'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _confirmedData?['title'] ?? 'Boarding Confirmed!';
    final subtitle = _confirmedData?['subtitle'] ?? "You're now on board.";
    final pickedUp = _confirmedData?['pickedUp'] ?? '8:15 AM';
    final boarded = _confirmedData?['boarded'] ?? '8:17 AM';
    final progress = _confirmedData?['inProgress'] ?? 'On the way to office';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 32),
                    const BoardingSuccessBadge(),
                    const SizedBox(height: 24),
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 36),

                    // Progress timeline card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          _buildTimelineItem(
                            title: 'Picked Up',
                            time: pickedUp,
                            isDone: true,
                          ),
                          const Divider(height: 24),
                          _buildTimelineItem(
                            title: 'Boarded',
                            time: boarded,
                            isDone: true,
                          ),
                          const Divider(height: 24),
                          _buildTimelineItem(
                            title: 'In Progress',
                            time: progress,
                            isDone: false,
                            isActive: true,
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    EmployeePrimaryButton(
                      label: 'Track Trip',
                      icon: Icons.my_location_rounded,
                      onPressed: () => context.push(AppRoutes.tripInProgressEnRoute),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildTimelineItem({
    required String title,
    required String time,
    required bool isDone,
    bool isActive = false,
  }) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: isDone ? AppColors.success : AppColors.primaryBlue,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Icon(
              isDone ? Icons.check : Icons.directions_car_filled_rounded,
              size: 12,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        Text(
          time,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isActive ? AppColors.primaryBlue : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
