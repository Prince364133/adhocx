import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class RequestChangeOptionsScreen extends StatefulWidget {
  const RequestChangeOptionsScreen({super.key});

  @override
  State<RequestChangeOptionsScreen> createState() => _RequestChangeOptionsScreenState();
}

class _RequestChangeOptionsScreenState extends State<RequestChangeOptionsScreen> {
  int _selectedOption = 0;

  final List<String> _options = [
    'Change Pickup Location',
    'Change Pickup Time',
    'Change Drop Location',
    'Change Drop Time',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Text(
                  'Request Change',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),

              const SizedBox(height: 32),

              Text(
                'What do you want to change?',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 18),

              // 4 Radio Option Cards
              ...List.generate(_options.length, (index) {
                final isSelected = _selectedOption == index;
                final text = _options[index];

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppColors.primaryBlue : AppColors.border,
                      width: isSelected ? 2.0 : 1.2,
                    ),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                    leading: Icon(
                      isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                      color: isSelected ? AppColors.primaryBlue : AppColors.textMuted,
                      size: 22,
                    ),
                    title: Text(
                      text,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? AppColors.primaryBlueDark : AppColors.textPrimary,
                      ),
                    ),
                    onTap: () => setState(() => _selectedOption = index),
                  ),
                );
              }),

              const Spacer(),

              // Continue Button
              EmployeePrimaryButton(
                label: 'Continue',
                onPressed: () => context.push(AppRoutes.changeDetails),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}



