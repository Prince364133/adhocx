import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Shared scaffold for the incident / complaint / lost-property forms.
///
/// - Required description starts EMPTY (with a hint) — the old screens
///   pre-filled it with sample text that looked like user input.
/// - The n/200 counter updates live.
/// - Submit is enabled only once the required description has text.
class IncidentFormScreen extends StatefulWidget {
  final String title;
  final String? intro;
  final Widget? header;

  /// Fields shown above the description (selectors, trip info…).
  final List<Widget> Function(BuildContext context) topFields;
  final String descriptionLabel;
  final String descriptionHint;
  final String mediaLabel;
  final List<IconData> mediaIcons;
  final String submitLabel;
  final String submittedMessage;

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
  });

  @override
  State<IncidentFormScreen> createState() => _IncidentFormScreenState();
}

class _IncidentFormScreenState extends State<IncidentFormScreen> {
  static const _maxLength = 200;
  final TextEditingController _description = TextEditingController();

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

  void _submit() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(widget.submittedMessage)),
    );
    context.push(AppRoutes.myRequestsTickets);
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final canSubmit = _description.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: p.background,
      appBar: EmployeeAppBar(title: widget.title),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xxl,
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
                onPressed: canSubmit ? _submit : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bold form label with spacing below.
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

/// Dropdown on Driver input tokens.
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

/// Read-only value box (date / trip) with a leading icon.
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

/// Attachment tile. Uploads aren't wired yet, so tiles are clearly inert
/// ("coming soon") rather than looking like working buttons.
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
