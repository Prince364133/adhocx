import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserRaiseIssueScreen extends StatefulWidget {
  const UserRaiseIssueScreen({super.key});

  @override
  State<UserRaiseIssueScreen> createState() => _UserRaiseIssueScreenState();
}

class _UserRaiseIssueScreenState extends State<UserRaiseIssueScreen> {
  String? _selectedCategory;
  final List<String> _categories = ['Payments', 'Trip Issue', 'Driver Issue', 'Account', 'Other'];

  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Raise an Issue', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Issue Category Dropdown
              Text('Issue Category', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                hint: const Text('Select Category', style: TextStyle(fontSize: 13)),
                items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13)))).toList(),
                onChanged: (val) => setState(() => _selectedCategory = val),
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Issue Title
              Text('Issue Title', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: _titleController,
                decoration: InputDecoration(
                  hintText: 'Briefly describe your issue',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Description
              Text('Description', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextField(
                controller: _descController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Please provide more details about your issue',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
              ),
              const Align(
                alignment: Alignment.centerRight,
                child: Text('0/500', style: TextStyle(fontSize: 10, color: AppColors.slate400)),
              ),

              const SizedBox(height: AppSpacing.md),

              // Attachments (Optional)
              Text('Attachments (Optional)', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                height: 90,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.file_upload_outlined, color: AppColors.primary),
                      const SizedBox(height: 4),
                      Text('Add Attachment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                      Text('Upload screenshots or documents.', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              AppPrimaryButton(
                text: 'Submit Issue',
                onPressed: () {
                  context.push(AppRoutes.userTicketDetailsOpenScreen);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
