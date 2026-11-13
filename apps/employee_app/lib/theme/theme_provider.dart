import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Copied from the Driver app (apps/mobile/lib/shared/theme/theme_provider.dart).
/// Only difference: the driver-only dispatch-bubble theme sync is removed.
class ThemeProvider extends ChangeNotifier {
  /// Dark mode is wired end-to-end but only switched on for users once every
  /// employee screen reads colours from the theme (design migration Phase 3).
  /// Until then the app always renders light, whatever is stored.
  static const bool darkModeReady = false;

  static const String _themeKey = 'app_theme_mode';

  ThemeMode _themeMode = ThemeMode.light;

  ThemeMode get themeMode => _themeMode;

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_themeKey);
    if (stored != null) {
      _themeMode = _fromString(stored);
    } else {
      _themeMode = ThemeMode.light;
      await prefs.setString(_themeKey, 'light');
    }
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    final modeStr = _toString(mode);
    await prefs.setString(_themeKey, modeStr);
  }

  void toggleTheme() {
    setThemeMode(_themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark);
  }

  String _toString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  ThemeMode _fromString(String value) {
    switch (value) {
      case 'dark':
        return ThemeMode.dark;
      case 'system':
        return ThemeMode.system;
      default:
        return ThemeMode.light;
    }
  }

  /// Returns true if the effective theme is dark, considering system preference.
  bool isDark(BuildContext context) {
    if (_themeMode == ThemeMode.system) {
      return MediaQuery.of(context).platformBrightness == Brightness.dark;
    }
    return _themeMode == ThemeMode.dark;
  }

  String get themeModeLabel {
    switch (_themeMode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System';
    }
  }
}
