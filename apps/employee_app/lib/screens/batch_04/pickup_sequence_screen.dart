import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';

/// Screen 5: Pickup Sequence / Trip Route (Pickup)
class PickupSequenceScreen extends StatefulWidget {
  const PickupSequenceScreen({super.key});

  @override
  State<PickupSequenceScreen> createState() => _PickupSequenceScreenState();
}

class _PickupSequenceScreenState extends State<PickupSequenceScreen> {
  List<dynamic> _stops = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStops();
  }

  Future<void> _loadStops() async {
    final assignment = await MockDataService.getDriverAssignment();
    if (mounted) {
      setState(() {
        _stops = assignment['pickup_sequence'] as List<dynamic>? ?? [];
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
          'Trip Route (Pickup)',
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
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                child: Container(
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
                        'Pickup & Drop Stops',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Estimated pickup order calculated for optimal commute efficiency.',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Vertical Steps Timeline
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _stops.length,
                        itemBuilder: (context, index) {
                          final stop = _stops[index] as Map<String, dynamic>;
                          final name = stop['name'] ?? '';
                          final time = stop['time'] ?? '';
                          final location = stop['location'] ?? '';
                          final isCurrent = stop['isCurrent'] == true;
                          final isDrop = stop['isDrop'] == true;
                          final isLast = index == _stops.length - 1;

                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Left Timeline Pillar
                              Column(
                                children: [
                                  Container(
                                    width: 22,
                                    height: 22,
                                    decoration: BoxDecoration(
                                      color: isCurrent
                                          ? AppColors.primaryBlue
                                          : isDrop
                                              ? AppColors.secondaryOrange
                                              : const Color(0xFFE2E8F0),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: isDrop
                                          ? const Icon(Icons.business_rounded, size: 12, color: Colors.white)
                                          : isCurrent
                                              ? const Icon(Icons.person, size: 12, color: Colors.white)
                                              : Text(
                                                  '${index + 1}',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w700,
                                                    color: AppColors.textSecondary,
                                                  ),
                                                ),
                                    ),
                                  ),
                                  if (!isLast)
                                    Container(
                                      width: 2,
                                      height: 52,
                                      color: const Color(0xFFCBD5E1),
                                    ),
                                ],
                              ),
                              const SizedBox(width: 14),

                              // Stop Content
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 20),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            name,
                                            style: GoogleFonts.inter(
                                              fontSize: 14,
                                              fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                                              color: isCurrent ? AppColors.primaryBlue : AppColors.textPrimary,
                                            ),
                                          ),
                                          if (isCurrent) ...[
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryBlueLight.withOpacity(0.5),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                'Current Pickup',
                                                style: GoogleFonts.inter(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.primaryBlueDark,
                                                ),
                                              ),
                                            ),
                                          ],
                                          if (isDrop) ...[
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFFFEDD5),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Text(
                                                'Office Drop',
                                                style: GoogleFonts.inter(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.secondaryOrange,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '$time • $location',
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

