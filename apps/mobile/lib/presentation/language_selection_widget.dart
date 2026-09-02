import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageProvider extends ChangeNotifier {
  Locale _currentLocale = const Locale('en');

  Locale get currentLocale => _currentLocale;

  // Load saved language on startup
  Future<void> loadSavedLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    final savedLang = prefs.getString('app_language') ?? 'en';
    _currentLocale = Locale(savedLang);
    notifyListeners();
  }

  // Change language and save to local storage
  Future<void> setLanguage(String languageCode) async {
    _currentLocale = Locale(languageCode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_language', languageCode);
    notifyListeners(); // This tells MaterialApp to rebuild!
  }
}

class LanguageSelectionWidget extends StatelessWidget {
  const LanguageSelectionWidget({super.key});

  static const _languages = <String, String>{
    'en': 'English',
    'hi': 'हिन्दी',
  };

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LanguageProvider>();
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline),
      ),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _languages.entries.map((entry) {
          final selected = provider.currentLocale.languageCode == entry.key;
          return ChoiceChip(
            label: Text(entry.value),
            selected: selected,
            onSelected: (_) => provider.setLanguage(entry.key),
          );
        }).toList(),
      ),
    );
  }
}