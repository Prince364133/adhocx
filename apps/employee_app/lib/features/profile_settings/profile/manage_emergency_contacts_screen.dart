import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class EmployeeEmergencyContact {
  final String id;
  final String name;
  final String phone;

  const EmployeeEmergencyContact({
    required this.id,
    required this.name,
    required this.phone,
  });

  factory EmployeeEmergencyContact.fromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';
    final name = json['name']?.toString() ?? '';
    final phone = json['phone']?.toString() ?? '';
    if (id.isEmpty || name.isEmpty || phone.isEmpty) {
      throw const FormatException('Saved emergency contact is incomplete');
    }
    return EmployeeEmergencyContact(id: id, name: name, phone: phone);
  }

  Map<String, String> toJson() => {'id': id, 'name': name, 'phone': phone};
}

class EmployeeEmergencyContactsStore {
  static const _storageKey = 'employee_emergency_contacts_v1';
  final SharedPreferences? _preferences;

  const EmployeeEmergencyContactsStore({SharedPreferences? preferences})
      : _preferences = preferences;

  Future<List<EmployeeEmergencyContact>> load() async {
    final preferences = _preferences ?? await SharedPreferences.getInstance();
    final encoded = preferences.getString(_storageKey);
    if (encoded == null) return const [];

    final decoded = jsonDecode(encoded);
    if (decoded is! List) {
      throw const FormatException('Saved emergency contacts are invalid');
    }
    return decoded.map((value) {
      if (value is! Map) {
        throw const FormatException('Saved emergency contact is invalid');
      }
      return EmployeeEmergencyContact.fromJson(
        Map<String, dynamic>.from(value),
      );
    }).toList(growable: false);
  }

  Future<void> save(List<EmployeeEmergencyContact> contacts) async {
    final preferences = _preferences ?? await SharedPreferences.getInstance();
    final saved = await preferences.setString(
      _storageKey,
      jsonEncode(contacts.map((contact) => contact.toJson()).toList()),
    );
    if (!saved) throw StateError('Unable to save emergency contacts');
  }
}

class ManageEmergencyContactsScreen extends StatefulWidget {
  final EmployeeEmergencyContactsStore store;

  const ManageEmergencyContactsScreen({
    super.key,
    this.store = const EmployeeEmergencyContactsStore(),
  });

  @override
  State<ManageEmergencyContactsScreen> createState() =>
      _ManageEmergencyContactsScreenState();
}

class _ManageEmergencyContactsScreenState
    extends State<ManageEmergencyContactsScreen> {
  List<EmployeeEmergencyContact> _contacts = const [];
  bool _isLoading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final contacts = await widget.store.load();
      if (!mounted) return;
      setState(() {
        _contacts = contacts;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Unable to load contacts: $error';
        _isLoading = false;
      });
    }
  }

  Future<void> _addContact() async {
    final contact = await context.push<EmployeeEmergencyContact>(
      AppRoutes.emergencyContactForm,
    );
    if (contact != null) {
      await _saveContacts([..._contacts, contact]);
    }
  }

  Future<void> _editContact(EmployeeEmergencyContact existing) async {
    final updated = await context.push<EmployeeEmergencyContact>(
      AppRoutes.emergencyContactForm,
      extra: existing,
    );
    if (updated == null) return;
    await _saveContacts([
      for (final contact in _contacts)
        if (contact.id == existing.id) updated else contact,
    ]);
  }

  Future<void> _deleteContact(EmployeeEmergencyContact contact) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete contact?'),
        content: Text('Remove ${contact.name} from your emergency contacts?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (shouldDelete != true) return;
    await _saveContacts(
      _contacts.where((item) => item.id != contact.id).toList(),
    );
  }

  Future<void> _saveContacts(List<EmployeeEmergencyContact> contacts) async {
    try {
      await widget.store.save(contacts);
      if (!mounted) return;
      setState(() => _contacts = contacts);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to save contacts: $error')),
      );
    }
  }

  Widget _contactCard(
    BuildContext context,
    EmployeeEmergencyContact contact,
  ) {
    final p = EmployeePalette.of(context);
    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: p.accentTint,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.person_outline_rounded, color: p.accent),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  contact.name,
                  style: AppTypography.bodyMedium(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  contact.phone,
                  style: AppTypography.small(color: p.textSecondary),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Edit ${contact.name}',
            onPressed: () => _editContact(contact),
            icon: Icon(Icons.edit_outlined, color: p.accent),
          ),
          IconButton(
            tooltip: 'Delete ${contact.name}',
            onPressed: () => _deleteContact(contact),
            icon: const Icon(Icons.delete_outline_rounded,
                color: AppColors.error),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Manage Contacts'),
      body: SafeArea(
        child: _isLoading
          ? const Padding(
              padding: EdgeInsets.all(AppSpacing.pageHorizontal),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonText(width: 180, height: 18),
                  SizedBox(height: AppSpacing.xl),
                  SkeletonListItem(),
                  SizedBox(height: AppSpacing.sm),
                  SkeletonListItem(),
                ],
              ),
            )
            : _loadError != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _loadError!,
                            textAlign: TextAlign.center,
                            style: AppTypography.body(color: p.textSecondary),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          EmployeeSecondaryButton(
                            label: 'Retry',
                            onPressed: _loadContacts,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.pageHorizontal,
                      vertical: AppSpacing.lg,
                    ),
                    children: [
                      Text(
                        'Add and update the people you trust as emergency contacts.',
                        style: AppTypography.small(color: p.textSecondary),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      EmployeePrimaryButton(
                        label: 'Add Contact',
                        icon: Icons.add_rounded,
                        onPressed: _addContact,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      if (_contacts.isEmpty)
                        AppCard(
                          child: Column(
                            children: [
                              Icon(Icons.contact_phone_outlined,
                                  color: p.textMuted, size: 32),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                'No emergency contacts yet',
                                style: AppTypography.bodyMedium(
                                  color: p.textPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        for (final contact in _contacts) ...[
                          _contactCard(context, contact),
                          const SizedBox(height: AppSpacing.sm + 2),
                        ],
                    ],
                  ),
      ),
    );
  }
}

class EmergencyContactFormScreen extends StatefulWidget {
  final EmployeeEmergencyContact? contact;

  const EmergencyContactFormScreen({super.key, this.contact});

  @override
  State<EmergencyContactFormScreen> createState() =>
      _EmergencyContactFormScreenState();
}

class _EmergencyContactFormScreenState
    extends State<EmergencyContactFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.contact?.name ?? '');
    _phoneController = TextEditingController(text: widget.contact?.phone ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  String? _validateName(String? value) {
    if (value == null || value.trim().isEmpty) return 'Enter a name';
    return null;
  }

  String? _validatePhone(String? value) {
    final phone = value?.trim() ?? '';
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (!RegExp(r'^\+?[0-9\s()-]+$').hasMatch(phone) ||
        digits.length < 7 ||
        digits.length > 15) {
      return 'Enter a valid phone number';
    }
    return null;
  }

  void _save() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    context.pop(
      EmployeeEmergencyContact(
        id: widget.contact?.id ??
            'contact_${DateTime.now().microsecondsSinceEpoch}',
        name: _nameController.text.trim(),
        phone: _phoneController.text.trim(),
      ),
    );
  }

  Widget _field({
    required EmployeePalette palette,
    required String label,
    required TextEditingController controller,
    required String? Function(String?) validator,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    void Function(String)? onFieldSubmitted,
  }) {
    OutlineInputBorder border(Color color, [double width = 1.2]) =>
        OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: BorderSide(color: color, width: width),
        );

    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      onFieldSubmitted: onFieldSubmitted,
      textCapitalization:
          label == 'Name' ? TextCapitalization.words : TextCapitalization.none,
      cursorColor: palette.accent,
      style: AppTypography.body(color: palette.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: palette.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        enabledBorder: border(palette.border),
        border: border(palette.border),
        focusedBorder: border(palette.accent, 1.8),
        errorBorder: border(AppColors.error),
        focusedErrorBorder: border(AppColors.error, 1.8),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final isEditing = widget.contact != null;

    return Scaffold(
      backgroundColor: p.background,
      appBar: EmployeeAppBar(
        title: isEditing ? 'Edit Contact' : 'Add Contact',
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
              vertical: AppSpacing.xl,
            ),
            children: [
              _field(
                palette: p,
                label: 'Name',
                controller: _nameController,
                validator: _validateName,
                textInputAction: TextInputAction.next,
                onFieldSubmitted: (_) => FocusScope.of(context).nextFocus(),
              ),
              const SizedBox(height: AppSpacing.lg),
              _field(
                palette: p,
                label: 'Phone Number',
                controller: _phoneController,
                validator: _validatePhone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _save(),
              ),
              const SizedBox(height: AppSpacing.xxl),
              EmployeePrimaryButton(
                label: isEditing ? 'Save Changes' : 'Add Contact',
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
