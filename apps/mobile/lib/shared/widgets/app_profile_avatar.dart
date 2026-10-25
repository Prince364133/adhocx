import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/networking/api_client.dart';
import '../../services/auth_service.dart';
import '../theme/app_colors.dart';

/// Universal user profile avatar component.
/// Automatically resolves profile photos from:
/// 1. Explicit `imageUrl` parameter
/// 2. Live authenticated user (`AuthService.instance.currentUser?.effectivePhotoUrl`)
/// Handles base64 Data URIs, absolute URLs, relative API upload paths,
/// with graceful fallback to initial letter or person icon.
class AppProfileAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double radius;
  final bool? isDark;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderWidth;
  final bool showOnlineBadge;
  final bool isOnline;
  final double onlineBadgeRadius;
  final VoidCallback? onTap;
  final Widget? fallbackIcon;

  const AppProfileAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.radius = 20,
    this.isDark,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 0,
    this.showOnlineBadge = false,
    this.isOnline = true,
    this.onlineBadgeRadius = 7,
    this.onTap,
    this.fallbackIcon,
  });

  /// Converts relative, base64, localhost, or CDN image paths into fully-qualified URLs.
  static String resolveDocumentUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return '';
    final trimmed = rawUrl.trim();
    if (trimmed == 'null' || trimmed == 'undefined') return '';

    // Base64 Data URI
    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }

    // Absolute HTTP(S) URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (trimmed.contains('localhost') || trimmed.contains('127.0.0.1')) {
        return trimmed.replaceAll(
          RegExp(r'http://(localhost|127\.0\.0\.1)(:\d+)?'),
          'https://api.adhocx.com',
        );
      }
      return trimmed;
    }

    // Relative path (e.g. /uploads/uuid.jpg, uploads/uuid.jpg)
    final cleanPath = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    final apiBase = ApiClient.instance.baseUrl.replaceAll('/api/v1', '');
    return '$apiBase$cleanPath';
  }

  @override
  Widget build(BuildContext context) {
    final dark = isDark ?? (Theme.of(context).brightness == Brightness.dark);

    // If an explicit image URL is provided, render it directly
    if (imageUrl != null && imageUrl!.trim().isNotEmpty && imageUrl != 'null' && imageUrl != 'undefined') {
      return _buildContent(context, resolveDocumentUrl(imageUrl), dark);
    }

    // Otherwise, listen reactively to auth state changes so avatar updates dynamically everywhere
    return ValueListenableBuilder<UserModel?>(
      valueListenable: AuthService.instance.authStateListenable,
      builder: (context, user, _) {
        final resolvedUrl = resolveDocumentUrl(user?.effectivePhotoUrl);
        final effectiveName = (name != null && name!.trim().isNotEmpty)
            ? name!
            : (user?.fullName ?? '');
        return _buildContent(context, resolvedUrl, dark, resolvedName: effectiveName);
      },
    );
  }

  Widget _buildContent(BuildContext context, String url, bool dark, {String? resolvedName}) {
    final effectiveName = resolvedName ?? name ?? '';
    final initial = effectiveName.trim().isNotEmpty
        ? effectiveName.trim()[0].toUpperCase()
        : '';

    final diameter = radius * 2;

    Widget avatarCore;

    if (url.isNotEmpty) {
      if (url.startsWith('data:image')) {
        try {
          final commaIdx = url.indexOf(',');
          final base64String = commaIdx != -1 ? url.substring(commaIdx + 1) : url;
          final bytes = base64Decode(base64String.replaceAll(RegExp(r'\s+'), ''));
          avatarCore = Image.memory(
            bytes,
            width: diameter,
            height: diameter,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _buildFallback(dark, initial),
          );
        } catch (_) {
          avatarCore = _buildFallback(dark, initial);
        }
      } else {
        avatarCore = Image.network(
          url,
          width: diameter,
          height: diameter,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallback(dark, initial),
        );
      }
    } else {
      avatarCore = _buildFallback(dark, initial);
    }

    Widget content = Container(
      width: diameter,
      height: diameter,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: backgroundColor ?? (dark ? AppColors.surfaceElevatedDark : AppColors.borderLight),
        border: borderWidth > 0
            ? Border.all(
                color: borderColor ?? (dark ? AppColors.borderDark : AppColors.borderLight),
                width: borderWidth,
              )
            : null,
      ),
      child: ClipOval(child: avatarCore),
    );

    if (showOnlineBadge) {
      final badgeDiameter = onlineBadgeRadius * 2;
      content = Stack(
        clipBehavior: Clip.none,
        children: [
          content,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: badgeDiameter,
              height: badgeDiameter,
              decoration: BoxDecoration(
                color: isOnline ? AppColors.accentGreen : AppColors.textMutedLight,
                shape: BoxShape.circle,
                border: Border.all(
                  color: dark ? AppColors.surfaceDark : Colors.white,
                  width: (badgeDiameter * 0.16).clamp(1.5, 3.0),
                ),
                boxShadow: isOnline
                    ? [
                        BoxShadow(
                          color: AppColors.accentGreen.withValues(alpha: 0.5),
                          blurRadius: 4,
                          spreadRadius: 0.5,
                        ),
                      ]
                    : null,
              ),
            ),
          ),
        ],
      );
    }

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: content,
      );
    }

    return content;
  }

  Widget _buildFallback(bool dark, String initial) {
    if (initial.isNotEmpty) {
      return Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryHover],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Text(
            initial,
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: (radius * 0.75).clamp(10.0, 32.0),
            ),
          ),
        ),
      );
    }

    return Container(
      color: backgroundColor ?? (dark ? AppColors.surfaceElevatedDark : AppColors.borderLight),
      child: Center(
        child: fallbackIcon ??
            Icon(
              Icons.person,
              size: (radius * 0.9).clamp(12.0, 36.0),
              color: dark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
      ),
    );
  }
}
