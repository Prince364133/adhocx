import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart'; 

import '../../routes/app_routes.dart';
import '../../theme/theme_provider.dart';
import './modals/edit_profile_modal.dart';
import './modals/help_modal.dart';
import './modals/incentives_modal.dart';
import './modals/privacy_modal.dart';
import './modals/rate_card_modal.dart';
import './modals/terms_modal.dart';
import './widgets/profile_driver_card_widget.dart';
import '../language_selection_widget.dart'; 
import './widgets/profile_menu_item_widget.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _showLanguageSwitcher = false;
  
  Map<String, dynamic> _driverProfile = {};
  bool _isLoading = true; 

  @override
  void initState() {
    super.initState();
    _fetchProfile(); 
  }

  Future<void> _fetchProfile() async {
    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      
      if (user != null) {
        final response = await supabase
            .from('driver_profiles')
            .select()
            .eq('user_id', user.id) 
            .maybeSingle();

        if (response != null && mounted) {
          setState(() {
            _driverProfile = Map<String, dynamic>.from(response);
            
            _driverProfile['name'] = response['full_name'] ?? 'Unknown Driver';
            _driverProfile['pan'] = response['pan_number'];
            _driverProfile['aadhaar'] = response['aadhaar_number'];
            _driverProfile['account_number'] = response['bank_account_number'];
            _driverProfile['ifsc'] = response['bank_ifsc'];
            _driverProfile['is_verified'] = response['is_approved'];
            _driverProfile['photo_url'] = response['profile_photo_url'];
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading profile: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _openModal(Widget modal) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => modal,
    );
  }

  void _signOut() {
    final cs = Theme.of(context).colorScheme;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Sign Out',
          style: TextStyle(color: cs.onSurface, fontSize: 18),
        ),
        content: Text(
          'Are you sure you want to sign out?',
          style: TextStyle(color: cs.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancel', style: TextStyle(color: cs.onSurfaceVariant)),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Supabase.instance.client.auth.signOut(); 
              context.go(AppRoutes.authScreen);
            },
            child: const Text(
              'Sign Out',
              style: TextStyle(color: Color(0xFFef4444)),
            ),
          ),
        ],
      ),
    );
  }

  void _showThemeSelector() {
    final themeProvider = context.read<ThemeProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return _ThemeSelectorSheet(themeProvider: themeProvider);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final themeProvider = context.watch<ThemeProvider>();
    final languageProvider = context.watch<LanguageProvider>();
    final currentLang = languageProvider.currentLocale.languageCode.toUpperCase();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(cs),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                children: [
                  _isLoading
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(30.0),
                            child: CircularProgressIndicator(color: Color(0xFFf59e0b)),
                          ),
                        )
                      : ProfileDriverCardWidget(
                          profile: _driverProfile,
                          onTap: () async {
                            await _openModal(EditProfileModal(profile: _driverProfile));
                            _fetchProfile(); 
                          },
                        ),
                  const SizedBox(height: 20),
                  _buildMenuSection(cs, themeProvider, currentLang),
                  const SizedBox(height: 16),
                  
                  if (_showLanguageSwitcher) ...[
                    const LanguageSelectionWidget(),
                    const SizedBox(height: 16),
                  ],
                  
                  _buildSignOutButton(cs),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ColorScheme cs) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border(bottom: BorderSide(color: cs.outline, width: 1)),
      ),
      child: Row(
        children: [
          // Custom App Logo Integration
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.asset(
              'assets/images/adhocx_logo-1787692728598.png',
              width: 36,
              height: 36,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Driver Profile',
            style: TextStyle(
              color: cs.onSurface,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuSection(ColorScheme cs, ThemeProvider themeProvider, String currentLang) {
    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.outline),
      ),
      child: Column(
        children: [
          ProfileMenuItemWidget(
            icon: Icons.speed_rounded,
            iconColor: const Color(0xFF0ea5e9),
            label: 'Driver Rate Card',
            onTap: () => _openModal(const RateCardModal()),
          ),
          _divider(cs),
          ProfileMenuItemWidget(
            icon: Icons.emoji_events_rounded,
            iconColor: const Color(0xFFf59e0b),
            label: 'Daily Target Incentives',
            onTap: () => _openModal(const IncentivesModal()),
          ),
          _divider(cs),
          ProfileMenuItemWidget(
            icon: Icons.headset_mic_rounded,
            iconColor: const Color(0xFF10b981),
            label: 'Help & Operations Support',
            onTap: () => _openModal(const HelpModal()),
          ),
          _divider(cs),
          ProfileMenuItemWidget(
            icon: Icons.gavel_rounded,
            iconColor: cs.onSurfaceVariant,
            label: 'Terms & Conditions',
            onTap: () => _openModal(const TermsModal()),
          ),
          _divider(cs),
          ProfileMenuItemWidget(
            icon: Icons.privacy_tip_outlined,
            iconColor: cs.onSurfaceVariant,
            label: 'Privacy Policy',
            onTap: () => _openModal(const PrivacyModal()),
          ),
          _divider(cs),
          ProfileMenuItemWidget(
            icon: Icons.language_rounded,
            iconColor: const Color(0xFF8b5cf6),
            label: 'App Language',
            trailing: Text(
              currentLang, 
              style: TextStyle(
                color: cs.primary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            onTap: () =>
                setState(() => _showLanguageSwitcher = !_showLanguageSwitcher),
          ),
          _divider(cs),
          ProfileMenuItemWidget(
            icon: _themeIcon(themeProvider.themeMode),
            iconColor: const Color(0xFF22c55e),
            label: 'App Theme',
            trailing: Text(
              themeProvider.themeModeLabel,
              style: TextStyle(
                color: cs.primary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            onTap: _showThemeSelector,
          ),
        ],
      ),
    );
  }

  IconData _themeIcon(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return Icons.light_mode_rounded;
      case ThemeMode.dark:
        return Icons.dark_mode_rounded;
      case ThemeMode.system:
        return Icons.brightness_auto_rounded;
    }
  }

  Widget _buildSignOutButton(ColorScheme cs) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton.icon(
        onPressed: _signOut,
        icon: const Icon(Icons.logout_rounded, size: 18),
        label: const Text('Sign Out'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFef4444).withAlpha(31),
          foregroundColor: const Color(0xFFef4444),
          side: const BorderSide(color: Color(0xFFef4444), width: 1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _divider(ColorScheme cs) =>
      Divider(color: cs.outline, height: 1, indent: 16, endIndent: 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Selector Bottom Sheet
// ─────────────────────────────────────────────────────────────────────────────
class _ThemeSelectorSheet extends StatefulWidget {
  final ThemeProvider themeProvider;
  const _ThemeSelectorSheet({required this.themeProvider});

  @override
  State<_ThemeSelectorSheet> createState() => _ThemeSelectorSheetState();
}

class _ThemeSelectorSheetState extends State<_ThemeSelectorSheet> {
  late ThemeMode _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.themeProvider.themeMode;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    final options = [
      _ThemeOption(
        mode: ThemeMode.system,
        icon: Icons.brightness_auto_rounded,
        label: 'System Default',
        subtitle: 'Follow device setting',
      ),
      _ThemeOption(
        mode: ThemeMode.light,
        icon: Icons.light_mode_rounded,
        label: 'Light',
        subtitle: 'Always use light theme',
      ),
      _ThemeOption(
        mode: ThemeMode.dark,
        icon: Icons.dark_mode_rounded,
        label: 'Dark',
        subtitle: 'Always use dark theme',
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: cs.outline, width: 1)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: cs.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Choose Theme',
            style: TextStyle(
              color: cs.onSurface,
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Select your preferred appearance',
            style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13),
          ),
          const SizedBox(height: 20),
          ...options.map((opt) {
            final isSelected = _selected == opt.mode;
            return GestureDetector(
              onTap: () async {
                setState(() => _selected = opt.mode);
                await widget.themeProvider.setThemeMode(opt.mode);
                if (context.mounted) Navigator.of(context).pop();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? cs.primary.withAlpha(26)
                      : cs.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? cs.primary : cs.outline,
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? cs.primary.withAlpha(38)
                            : cs.outline.withAlpha(80),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        opt.icon,
                        color: isSelected ? cs.primary : cs.onSurfaceVariant,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            opt.label,
                            style: TextStyle(
                              color: cs.onSurface,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            opt.subtitle,
                            style: TextStyle(
                              color: cs.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isSelected)
                      Icon(
                        Icons.check_circle_rounded,
                        color: cs.primary,
                        size: 22,
                      ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _ThemeOption {
  final ThemeMode mode;
  final IconData icon;
  final String label;
  final String subtitle;
  const _ThemeOption({
    required this.mode,
    required this.icon,
    required this.label,
    required this.subtitle,
  });
}