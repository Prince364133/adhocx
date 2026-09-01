import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../routes/app_routes.dart';
import '../language_selection_widget.dart';
import './widgets/auth_language_switcher_widget.dart';
import './widgets/auth_sign_in_form_widget.dart';
import './widgets/auth_sign_up_form_widget.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _activeTab = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _activeTab = _tabController.index);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _onSignInSuccess() {
    context.go(AppRoutes.kycUploadScreen);
  }

  void _onSignUpSuccess() {
    context.go(AppRoutes.kycUploadScreen);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 600;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: SafeArea(
        child: isTablet ? _buildTabletLayout() : _buildPhoneLayout(),
      ),
    );
  }

  Widget _buildPhoneLayout() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 16),
          _buildLanguageSwitcher(),
          const SizedBox(height: 32),
          _buildLogo(),
          const SizedBox(height: 32),
          _buildTabSwitcher(),
          const SizedBox(height: 24),
          _buildTabContent(),
          const SizedBox(height: 24),
          _buildFooter(),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildTabletLayout() {
    return Center(
      child: SizedBox(
        width: 480,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 32),
          child: Column(
            children: [
              _buildLanguageSwitcher(),
              const SizedBox(height: 32),
              _buildLogo(),
              const SizedBox(height: 32),
              _buildTabSwitcher(),
              const SizedBox(height: 24),
              _buildTabContent(),
              const SizedBox(height: 24),
              _buildFooter(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLanguageSwitcher() {
    final languageProvider = context.watch<LanguageProvider>();

    return Align(
      alignment: Alignment.centerRight,
      child: AuthLanguageSwitcherWidget(
        selected: languageProvider.currentLocale.languageCode.toUpperCase(),
        onChanged: languageProvider.setLanguage,
      ),
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            color: const Color(0xFF0d1117),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: const Color(0xFF22c55e).withAlpha(77),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF22c55e).withAlpha(51),
                blurRadius: 28,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              'assets/images/adhocx_logo-1787692728598.png',
              width: 88,
              height: 88,
              fit: BoxFit.contain,
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'AdhocX Driver',
          style: TextStyle(
            color: Color(0xFFffffff),
            fontSize: 26,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Corporate Mobility Partner Console',
          style: TextStyle(
            color: Color(0xFF94a3b8),
            fontSize: 13,
            fontWeight: FontWeight.w400,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildTabSwitcher() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF0d1117),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1a2332)),
      ),
      child: Row(children: [_buildTab(0, 'Sign In'), _buildTab(1, 'Register')]),
    );
  }

  Widget _buildTab(int index, String label) {
    final isActive = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          _tabController.animateTo(index);
          setState(() => _activeTab = index);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF22c55e) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isActive
                  ? const Color(0xFF000000)
                  : const Color(0xFF94a3b8),
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    return IndexedStack(
      index: _activeTab,
      children: [
        AuthSignInFormWidget(
          onSuccess: _onSignInSuccess,
          onRegisterTap: () {
            _tabController.animateTo(1);
            setState(() => _activeTab = 1);
          },
        ),
        AuthSignUpFormWidget(
          onSuccess: _onSignUpSuccess,
          onSignInTap: () {
            _tabController.animateTo(0);
            setState(() => _activeTab = 0);
          },
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0d1117),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1a2332)),
      ),
      child: const Text(
        'Corporate Fleet Partner Portal · Hyderabad B2B Network',
        textAlign: TextAlign.center,
        style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12),
      ),
    );
  }
}