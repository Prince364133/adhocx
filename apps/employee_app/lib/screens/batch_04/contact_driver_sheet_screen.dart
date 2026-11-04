import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';

/// Screen 11: Contact Driver Sheet / Screen
class ContactDriverSheetScreen extends StatefulWidget {
  const ContactDriverSheetScreen({super.key});

  @override
  State<ContactDriverSheetScreen> createState() => _ContactDriverSheetScreenState();
}

class _ContactDriverSheetScreenState extends State<ContactDriverSheetScreen> {
  Map<String, dynamic>? _driver;
  List<dynamic> _contactOptions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final assignment = await MockDataService.getDriverAssignment();
    if (mounted) {
      setState(() {
        _driver = assignment['driver'] as Map<String, dynamic>?;
        _contactOptions = assignment['contact_options'] as List<dynamic>? ?? [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _driver?['name'] ?? 'Suresh R';
    final rating = (_driver?['rating'] ?? 4.8).toDouble();
    final tripsCount = _driver?['tripsCompleted'] ?? 412;
    final phone = _driver?['phone'] ?? '+91 98765 00111';

    return Scaffold(
      backgroundColor: Colors.black54, // Modal backdrop styling
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(24),
                      topRight: Radius.circular(24),
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header with close button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Contact Driver',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: AppColors.textPrimary),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Driver Profile Header
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: AppColors.primaryBlueLight,
                        child: const Icon(Icons.person, color: AppColors.primaryBlue, size: 36),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        name,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 4),
                          Text(
                            '$rating ($tripsCount trips)',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Action Option 1: Call
                      _buildOptionTile(
                        icon: Icons.phone_in_talk_rounded,
                        title: 'Call Driver',
                        subtitle: 'Talk directly with your driver',
                        onTap: () {
                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Calling $name ($phone)...')),
                          );
                        },
                      ),
                      const SizedBox(height: 12),

                      // Action Option 2: Message
                      _buildOptionTile(
                        icon: Icons.chat_bubble_outline_rounded,
                        title: 'Message Driver',
                        subtitle: 'Send a text message',
                        onTap: () {
                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Opening messaging for $name...')),
                          );
                        },
                      ),
                      const SizedBox(height: 12),

                      // Action Option 3: Share Location
                      _buildOptionTile(
                        icon: Icons.my_location_rounded,
                        title: 'Share Location',
                        subtitle: 'Share your live location',
                        onTap: () {
                          Navigator.of(context).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Live location shared with driver.')),
                          );
                        },
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primaryBlueLight.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppColors.primaryBlue, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
