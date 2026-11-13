import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_07_illustrations.dart';
import 'package:adhocx_employee/widgets/employee_bottom_nav_bar.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 8: My Requests (Tickets)
class MyRequestsTicketsScreen extends StatefulWidget {
  const MyRequestsTicketsScreen({super.key});

  @override
  State<MyRequestsTicketsScreen> createState() =>
      _MyRequestsTicketsScreenState();
}

class _MyRequestsTicketsScreenState extends State<MyRequestsTicketsScreen> {
  List<dynamic> _tickets = [];
  bool _isLoading = true;
  int _selectedFilter = 0; // 0: All, 1: Open, 2: In Progress, 3: Closed

  final List<String> _filters = ['All', 'Open', 'In Progress', 'Closed'];

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    final safety = await MockDataService.getSafetyData();
    if (mounted) {
      setState(() {
        _tickets = safety['tickets'] as List<dynamic>? ?? [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Filter tickets according to active tab
    final filtered = _tickets.where((ticket) {
      if (_selectedFilter == 0) return true;
      final status = (ticket['status'] ?? '').toString().toLowerCase();
      if (_selectedFilter == 1) return status == 'open';
      if (_selectedFilter == 2) return status == 'in progress';
      if (_selectedFilter == 3)
        return status == 'resolved' || status == 'closed';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'My Requests',
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
              child: Column(
                children: [
                  // Filter Tab Bar
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: List.generate(_filters.length, (index) {
                        final isSelected = _selectedFilter == index;
                        return InkWell(
                          onTap: () => setState(() => _selectedFilter = index),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primaryBlue
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _filters[index],
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: isSelected
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : AppColors.textSecondary,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),

                  // Tickets List
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(20),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final item = filtered[index] as Map<String, dynamic>;
                        final category = item['category'] ?? '';
                        final created = item['created'] ?? '';
                        final status = item['status'] ?? '';

                        IconData icon = Icons.info_outline_rounded;
                        if (category.toString().contains('SOS'))
                          icon = Icons.notifications_active_rounded;
                        if (category.toString().contains('Driving'))
                          icon = Icons.flag_rounded;
                        if (category.toString().contains('Behavior'))
                          icon = Icons.chat_bubble_outline_rounded;
                        if (category.toString().contains('Property'))
                          icon = Icons.backpack_rounded;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: ListTile(
                            onTap: () =>
                                context.push(AppRoutes.requestDetailsTracking),
                            leading: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppColors.primaryBlueLight
                                    .withValues(alpha: 0.4),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(icon,
                                  color: AppColors.primaryBlue, size: 20),
                            ),
                            title: Text(
                              category,
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            subtitle: Text(
                              created,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TicketStatusPill(status: status),
                                const SizedBox(width: 8),
                                const Icon(Icons.chevron_right_rounded,
                                    size: 16, color: AppColors.textMuted),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(currentIndex: -1),
    );
  }
}
