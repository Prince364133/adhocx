import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/employee_primary_button.dart';

/// Screen 9: Select Language
class SelectLanguageScreen extends StatefulWidget {
  const SelectLanguageScreen({super.key});

  @override
  State<SelectLanguageScreen> createState() => _SelectLanguageScreenState();
}

class _SelectLanguageScreenState extends State<SelectLanguageScreen> {
  String _selectedLang = 'English';

  final List<String> _languages = [
    'English',
    'Hindi',
    'Telugu',
    'Tamil',
    'Kannada',
    'Marathi',
  ];

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
          'Select Language',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: List.generate(_languages.length, (index) {
                    final lang = _languages[index];
                    final isSelected = _selectedLang == lang;
                    final isLast = index == _languages.length - 1;

                    return Column(
                      children: [
                        ListTile(
                          onTap: () => setState(() => _selectedLang = lang),
                          title: Text(
                            lang,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected ? AppColors.primaryBlue : AppColors.textPrimary,
                            ),
                          ),
                          trailing: Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected ? AppColors.primaryBlue : Colors.transparent,
                              border: Border.all(
                                color: isSelected ? AppColors.primaryBlue : const Color(0xFFCBD5E1),
                                width: 2,
                              ),
                            ),
                            child: isSelected
                                ? const Center(child: Icon(Icons.check, size: 14, color: Colors.white))
                                : null,
                          ),
                        ),
                        if (!isLast) const Divider(height: 1),
                      ],
                    );
                  }),
                ),
              ),

              const Spacer(),

              EmployeePrimaryButton(
                label: 'Continue',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Language set to $_selectedLang.')),
                  );
                  Navigator.of(context).pop();
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
