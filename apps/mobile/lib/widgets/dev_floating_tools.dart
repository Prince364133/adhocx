import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:universal_html/html.dart' as html;

import '../core/networking/api_client.dart';
import '../routes/app_routes.dart';
import '../services/auth_provider.dart';
import '../services/auth_service.dart';
import '../services/onboarding_provider.dart';
import '../shared/theme/app_colors.dart';
import '../shared/theme/app_radius.dart';
import '../shared/theme/app_spacing.dart';
import '../shared/theme/theme_provider.dart';

/// Universal Floating Developer Widget for real-time cache clearing,
/// theme toggling, role switching and instant browser reload.
class DevFloatingTools extends StatefulWidget {
  const DevFloatingTools({super.key});

  @override
  State<DevFloatingTools> createState() => _DevFloatingToolsState();
}

class _DevFloatingToolsState extends State<DevFloatingTools> {
  bool _isExpanded = false;
  final Offset _position = const Offset(16, 76); // Offset from bottom-right

  Future<void> _handleHardRefresh({bool preserveAuth = true}) async {
    try {
      final token = preserveAuth ? await ApiClient.instance.getToken() : null;
      final prefs = await SharedPreferences.getInstance();

      final keys = prefs.getKeys();
      for (final key in keys) {
        if (preserveAuth && (key == 'adhocx_auth_token' || key == 'flutter.adhocx_auth_token')) {
          continue;
        }
        await prefs.remove(key);
      }

      if (preserveAuth && token != null) {
        await ApiClient.instance.setToken(token);
      }

      if (kIsWeb) {
        // Clear all web localStorage items except token
        final localToken = html.window.localStorage['flutter.adhocx_auth_token'] ??
            html.window.localStorage['adhocx_auth_token'];

        final storageKeys = html.window.localStorage.keys.toList();
        for (final k in storageKeys) {
          if (preserveAuth && (k == 'flutter.adhocx_auth_token' || k == 'adhocx_auth_token')) {
            continue;
          }
          html.window.localStorage.remove(k);
        }

        if (preserveAuth && localToken != null) {
          html.window.localStorage['flutter.adhocx_auth_token'] = localToken;
          html.window.localStorage['adhocx_auth_token'] = localToken;
        }

        // Trigger full browser reload
        html.window.location.reload();
      } else {
        if (mounted) {
          Fluttertoast.showToast(msg: 'Local cache cleared!');
          setState(() => _isExpanded = false);
        }
      }
    } catch (e) {
      debugPrint('Hard refresh error: $e');
      if (kIsWeb) html.window.location.reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: _position.dx,
      bottom: _position.dy,
      child: Material(
        color: Colors.transparent,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.5), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: _isExpanded ? _buildExpandedMenu(context) : _buildCollapsedPill(),
        ),
      ),
    );
  }

  Widget _buildCollapsedPill() {
    return InkWell(
      onTap: () => setState(() => _isExpanded = true),
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.bolt_rounded, size: 14, color: Colors.white),
            ),
            const SizedBox(width: 8),
            const Text(
              'Dev Tools',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpandedMenu(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final isDark = themeProvider.isDark(context);
    final onboarding = context.watch<OnboardingProvider>();

    return Container(
      width: 280,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.developer_mode_rounded, color: AppColors.primaryLight, size: 18),
                  SizedBox(width: 6),
                  Text(
                    'AdhocX Dev Tools',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () => setState(() => _isExpanded = false),
                icon: const Icon(Icons.close, color: Colors.white70, size: 18),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          const Divider(color: Colors.white24, height: 1),
          const SizedBox(height: AppSpacing.sm),

          // 1. Primary Hard Refresh Button (Keeps Login)
          ElevatedButton.icon(
            onPressed: () => _handleHardRefresh(preserveAuth: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text(
              'Hard Refresh (Keep Auth)',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 6),

          // 2. Theme Toggle Button
          OutlinedButton.icon(
            onPressed: () {
              themeProvider.toggleTheme();
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white24),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: Icon(
              isDark ? Icons.light_mode_rounded : Icons.dark_mode_outlined,
              size: 16,
              color: isDark ? AppColors.starAmber : Colors.white70,
            ),
            label: Text(
              isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme',
              style: const TextStyle(fontSize: 12),
            ),
          ),
          const SizedBox(height: 6),

          // 3. Quick Portal Switcher
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    final user = await AuthService.instance.ensureAuthenticatedSession(role: 'VENDOR');
                    if (context.mounted) {
                      context.read<AuthProvider>().setUser(user);
                      onboarding.setRole('VENDOR');
                      context.go(AppRoutes.userHomeScreen);
                      setState(() => _isExpanded = false);
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white24),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('🏢 User Portal', style: TextStyle(fontSize: 11)),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    final user = await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');
                    if (context.mounted) {
                      context.read<AuthProvider>().setUser(user);
                      onboarding.setRole('DRIVER');
                      context.go(AppRoutes.homeScreen);
                      setState(() => _isExpanded = false);
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white24),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('🚗 Driver Portal', style: TextStyle(fontSize: 11)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Quick Open Universal Location Search
          OutlinedButton.icon(
            onPressed: () {
              context.push(AppRoutes.universalLocationSearchScreen, extra: {'title': 'Universal Location Search'});
              setState(() => _isExpanded = false);
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white24),
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: Icon(Icons.location_searching_rounded, size: 16, color: AppColors.primaryLight),
            label: const Text(
              '📍 Test Location Search (OSM)',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 6),

          // 4. Full Reset (Wipe All & Go to Sign In)
          TextButton.icon(
            onPressed: () => _handleHardRefresh(preserveAuth: false),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.error,
              padding: const EdgeInsets.symmetric(vertical: 6),
            ),
            icon: const Icon(Icons.delete_outline, size: 14, color: AppColors.error),
            label: const Text(
              'Clear All & Full Reset',
              style: TextStyle(fontSize: 11, color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}
