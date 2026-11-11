import 'package:shared_preferences/shared_preferences.dart';

class LanguagePreferenceService {
  static const _languageKey = 'employee_selected_language';

  static Future<String> getSelectedLanguage() async {
    final preferences = await SharedPreferences.getInstance();
    return preferences.getString(_languageKey) ?? 'English';
  }

  static Future<void> setSelectedLanguage(String language) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_languageKey, language);
  }
}
