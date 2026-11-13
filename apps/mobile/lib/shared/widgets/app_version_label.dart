import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// "v1.0.37 • Build 44" read from the installed app, so the profile footer never shows a stale number.
class AppVersionLabel extends StatelessWidget {
  final TextStyle? style;
  const AppVersionLabel({super.key, this.style});

  static Future<String>? _cached;

  static Future<String> _load() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final build = info.buildNumber.isNotEmpty ? ' • Build ${info.buildNumber}' : '';
      return 'v${info.version}$build';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: _cached ??= _load(),
      builder: (context, snap) {
        final text = snap.data ?? '';
        if (text.isEmpty) return const SizedBox.shrink();
        return Text(text, textAlign: TextAlign.center, style: style);
      },
    );
  }
}
