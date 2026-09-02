import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../presentation/auth_screen/auth_screen.dart';
import '../presentation/kyc_upload_screen/kyc_upload_screen.dart';
import '../presentation/profile_screen/profile_screen.dart';
import '../presentation/trips_screen/trips_screen.dart';
import '../presentation/waitlist_gate_screen/waitlist_gate_screen.dart';
import '../presentation/wallet_screen/wallet_screen.dart';
import '../widgets/app_scaffold.dart';

class AppRoutes {
  static const String initial = '/';
  static const String authScreen = '/auth-screen';
  static const String kycUploadScreen = '/kyc-upload-screen';
  static const String waitlistGateScreen = '/waitlist-gate-screen';
  static const String tripsScreen = '/trips-screen';
  static const String walletScreen = '/wallet-screen';
  static const String profileScreen = '/profile-screen';
}

final GoRouter appRouter = GoRouter(
  initialLocation: AppRoutes.initial,
  redirect: (BuildContext context, GoRouterState state) async {
    final session = Supabase.instance.client.auth.currentSession;
    final isLoggedIn = session != null;
    final currentPath = state.matchedLocation;

    if (!isLoggedIn) {
      if (currentPath != AppRoutes.initial &&
          currentPath != AppRoutes.authScreen) {
        return AppRoutes.authScreen;
      }
      return null;
    }

    if (currentPath == AppRoutes.initial ||
        currentPath == AppRoutes.authScreen) {
      final userId = session.user.id;
      try {
        final response = await Supabase.instance.client
            .from('driver_profiles')
            .select('full_name, approval_status')
            .eq('user_id', userId) // <--- FIXED: Now correctly targets 'user_id'
            .maybeSingle();

        final bool hasCompletedKyc =
            response != null &&
            response['full_name'] != null &&
            response['full_name'].toString().trim().isNotEmpty;

        if (!hasCompletedKyc) {
          return AppRoutes.kycUploadScreen;
        }

        final String approvalStatus = response['approval_status'] ?? 'pending';
        if (approvalStatus == 'approved') {
          return AppRoutes.tripsScreen;
        } else {
          return AppRoutes.waitlistGateScreen;
        }
      } catch (e) {
        debugPrint('Router Redirect Error: $e');
        return AppRoutes.kycUploadScreen;
      }
    }

    return null;
  },
  routes: [
    GoRoute(
      path: AppRoutes.initial,
      pageBuilder: (context, state) => CustomTransitionPage(
        key: state.pageKey,
        child: const AuthScreen(),
        transitionDuration: const Duration(milliseconds: 280),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
            ),
            child: child,
          );
        },
      ),
    ),
    GoRoute(
      path: AppRoutes.authScreen,
      pageBuilder: (context, state) => CustomTransitionPage(
        key: state.pageKey,
        child: const AuthScreen(),
        transitionDuration: const Duration(milliseconds: 280),
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            FadeTransition(
              opacity: CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
              ),
              child: child,
            ),
      ),
    ),
    GoRoute(
      path: AppRoutes.kycUploadScreen,
      pageBuilder: (context, state) => CustomTransitionPage(
        key: state.pageKey,
        child: const KycUploadScreen(),
        transitionDuration: const Duration(milliseconds: 280),
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            SlideTransition(
              position:
                  Tween<Offset>(
                    begin: const Offset(0.04, 0),
                    end: Offset.zero,
                  ).animate(
                    CurvedAnimation(
                      parent: animation,
                      curve: Curves.easeOutCubic,
                    ),
                  ),
              child: FadeTransition(opacity: animation, child: child),
            ),
      ),
    ),
    GoRoute(
      path: AppRoutes.waitlistGateScreen,
      pageBuilder: (context, state) => CustomTransitionPage(
        key: state.pageKey,
        child: const WaitlistGateScreen(),
        transitionDuration: const Duration(milliseconds: 280),
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            FadeTransition(
              opacity: CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
              ),
              child: child,
            ),
      ),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          AppScaffold(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.tripsScreen,
              builder: (context, state) => const TripsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.walletScreen,
              builder: (context, state) => const WalletScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.profileScreen,
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),
  ],
);