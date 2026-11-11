import 'package:shared_preferences/shared_preferences.dart';

class LanguagePreferenceService {
  LanguagePreferenceService._();

  static const String _languageKey = 'employee_language';
  static const String defaultLanguage = 'English';

  static Future<String> getLanguage() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString(_languageKey) ?? defaultLanguage;
  }

  static Future<void> setLanguage(String language) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_languageKey, language);
  }
}
