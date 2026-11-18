import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Shared scaffold for incident / complaint / lost-property forms,
/// wired directly to POST /corporate/me/tickets.
class IncidentFormScreen extends StatefulWidget {
  final String title;
  final String? intro;
  final Widget? header;
  final List<Widget> Function(BuildContext context) topFields;
  final String descriptionLabel;
  final String descriptionHint;
  final String mediaLabel;
  final List<IconData> mediaIcons;
  final String submitLabel;
  final String submittedMessage;
  final String ticketCategory;
  final String? ticketSubject;
  final String ticketPriority;

  const IncidentFormScreen({
    super.key,
    required this.title,
    this.intro,
    this.header,
    required this.topFields,
    required this.descriptionLabel,
    required this.descriptionHint,
    this.mediaLabel = 'Add Photos / Video (Optional)',
    this.mediaIcons = const [Icons.image_outlined],
    required this.submitLabel,
    required this.submittedMessage,
    this.ticketCategory = 'GENERAL_SUPPORT',
    this.ticketSubject,
    this.ticketPriority = 'MEDIUM',
  });

  @override
  State<IncidentFormScreen> createState() => _IncidentFormScreenState();
}

class _IncidentFormScreenState extends State<IncidentFormScreen> {
  static const _maxLength = 200;
  final TextEditingController _description = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _description.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final desc = _description.text.trim();
    if (desc.isEmpty || _submitting) return;

    setState(() => _submitting = true);
    final data = maybeEmployeeData(context);
    try {
      if (data != null) {
        await data.repository.createTicket(
          category: widget.ticketCategory,
          subject: widget.ticketSubject ?? widget.title,
          description: desc,
          priority: widget.ticketPriority,
        );
        await data.loadTickets(force: true);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.submittedMessage),
          backgroundColor: AppColors.success,
        ),
      );
      context.push(AppRoutes.myRequestsTickets);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Unable to submit ticket: ${e.toString().replaceFirst('Exception: ', '')}',
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final canSubmit = _description.text.trim().isNotEmpty && !_submitting;

    return Scaffold(
      backgroundColor: p.background,
      appBar: EmployeeAppBar(title: widget.title),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.header != null) ...[
                widget.header!,
                const SizedBox(height: AppSpacing.lg),
              ],
              if (widget.intro != null) ...[
                Text(widget.intro!,
                    style: AppTypography.body(color: p.textSecondary)),
                const SizedBox(height: AppSpacing.xxl),
              ],
              ...widget.topFields(context),
              FormFieldLabel(widget.descriptionLabel),
              TextField(
                controller: _description,
                maxLines: 4,
                maxLength: _maxLength,
                textCapitalization: TextCapitalization.sentences,
                style: AppTypography.body(color: p.textPrimary),
                cursorColor: p.accent,
                decoration: InputDecoration(
                  hintText: widget.descriptionHint,
                  hintStyle: AppTypography.body(color: p.textMuted),
                  counterStyle: AppTypography.micro(color: p.textMuted),
                  filled: true,
                  fillColor: p.surface,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: AppRadius.borderXl,
                    borderSide: BorderSide(color: p.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: AppRadius.borderXl,
                    borderSide: BorderSide(color: p.accent, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              FormFieldLabel(widget.mediaLabel),
              Row(
                children: [
                  for (final icon in widget.mediaIcons) ...[
                    _MediaTile(icon: icon),
                    const SizedBox(width: AppSpacing.sm + 2),
                  ],
                  const _MediaTile(icon: Icons.add_rounded, isAdd: true),
                ],
              ),
              const SizedBox(height: AppSpacing.xxxl),
              EmployeePrimaryButton(
                label: widget.submitLabel,
                isLoading: _submitting,
                onPressed: canSubmit ? _submit : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class FormFieldLabel extends StatelessWidget {
  final String text;

  const FormFieldLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Text(
        text,
        style: AppTypography.small(
          color: p.textPrimary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class FormSelectField extends StatelessWidget {
  final String value;
  final List<String> options;
  final ValueChanged<String> onChanged;

  const FormSelectField({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      dropdownColor: p.surface,
      icon: Icon(Icons.keyboard_arrow_down_rounded, color: p.textSecondary),
      style: AppTypography.bodyMedium(color: p.textPrimary),
      decoration: InputDecoration(
        filled: true,
        fillColor: p.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderXl,
          borderSide: BorderSide(color: p.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderXl,
          borderSide: BorderSide(color: p.accent, width: 1.5),
        ),
      ),
      items: [
        for (final o in options) DropdownMenuItem(value: o, child: Text(o)),
      ],
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
    );
  }
}

class FormValueBox extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const FormValueBox({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return AppCard(
      child: Row(
        children: [
          Icon(icon, size: 18, color: p.accent),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.bodyMedium(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (subtitle != null)
                  Text(subtitle!,
                      style: AppTypography.caption(color: p.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MediaTile extends StatelessWidget {
  final IconData icon;
  final bool isAdd;

  const _MediaTile({required this.icon, this.isAdd = false});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Tooltip(
      message: 'Attachments coming soon',
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: isAdd ? p.surface : p.surfaceElevated,
          borderRadius: AppRadius.borderXl,
          border: Border.all(color: isAdd ? p.borderSubtle : p.border),
        ),
        child: Icon(icon, color: p.textMuted, size: isAdd ? 28 : 24),
      ),
    );
  }
}
