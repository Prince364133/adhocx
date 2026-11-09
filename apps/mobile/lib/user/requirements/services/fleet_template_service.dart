import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/fleet_template_model.dart';

class FleetTemplateService {
  FleetTemplateService._();
  static final FleetTemplateService instance = FleetTemplateService._();

  static const String _storageKey = 'adhocx_saved_fleet_templates';

  List<FleetTemplate>? _cachedTemplates;

  /// Retrieves all saved fleet templates.
  /// If the user has never saved any, pre-populates a smart corporate template
  /// matching the corporate route (e.g. "Corporate Transfer to Malakpet").
  Future<List<FleetTemplate>> getTemplates() async {
    if (_cachedTemplates != null) {
      return List.unmodifiable(_cachedTemplates!);
    }

    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_storageKey);

    if (jsonStr == null || jsonStr.trim().isEmpty) {
      // Seed default corporate template for quick daily run
      final sampleTemplates = _getInitialSampleTemplates();
      _cachedTemplates = sampleTemplates;
      await _persist(sampleTemplates);
      return List.unmodifiable(_cachedTemplates!);
    }

    try {
      final List<dynamic> rawList = jsonDecode(jsonStr) as List<dynamic>;
      _cachedTemplates = rawList
          .map((item) => FleetTemplate.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (_) {
      _cachedTemplates = [];
    }

    return List.unmodifiable(_cachedTemplates!);
  }

  /// Saves or updates a template
  Future<void> saveTemplate(FleetTemplate template) async {
    final list = (await getTemplates()).toList();
    final index = list.indexWhere((t) => t.id == template.id);
    if (index >= 0) {
      list[index] = template;
    } else {
      list.insert(0, template);
    }
    _cachedTemplates = list;
    await _persist(list);
  }

  /// Deletes a template by ID
  Future<void> deleteTemplate(String id) async {
    final list = (await getTemplates()).toList();
    list.removeWhere((t) => t.id == id);
    _cachedTemplates = list;
    await _persist(list);
  }

  /// Updates last run timestamp for a template
  Future<void> recordTemplateRun(String id) async {
    final list = (await getTemplates()).toList();
    final index = list.indexWhere((t) => t.id == id);
    if (index >= 0) {
      list[index] = list[index].copyWith(lastRunAt: DateTime.now());
      _cachedTemplates = list;
      await _persist(list);
    }
  }

  Future<void> _persist(List<FleetTemplate> list) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = list.map((t) => t.toJson()).toList();
    await prefs.setString(_storageKey, jsonEncode(raw));
  }

  /// No pre-built templates: vendors save their own. (Prices are never stored; every cab is
  /// re-priced by the server before booking.)
  List<FleetTemplate> _getInitialSampleTemplates() => <FleetTemplate>[];
}
