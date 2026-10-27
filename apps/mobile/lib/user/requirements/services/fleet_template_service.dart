import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cab_cart_item.dart';
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

  /// Pre-built sample template: 5 trips for 5 different locations / times to Malakpet & IT Corridor
  List<FleetTemplate> _getInitialSampleTemplates() {
    final now = DateTime.now();
    final todayStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    return [
      FleetTemplate(
        id: 'tmpl_corporate_malakpet_daily',
        name: 'Corporate Transfer to Malakpet',
        createdAt: now.subtract(const Duration(days: 2)),
        notes: 'Daily 5-cab employee shift transfer between HITEC City hub and Malakpet / Old City nodes.',
        cabs: [
          CabCartItem(
            id: 'sample_cab_1',
            vehicleType: 'SEDAN',
            vehicleLabel: 'Prime Sedan',
            passengers: 4,
            direction: 'OUTBOUND_FROM_OFFICE',
            officeHubId: 'HITEC_NANAKRAMGUDA',
            officeAddress: 'Cyber Towers, HITEC City, Hyderabad',
            officeLat: 17.4504,
            officeLng: 78.3808,
            localityName: 'Malakpet Gunj',
            pickupAddress: 'Cyber Towers, HITEC City, Hyderabad',
            pickupLat: 17.4504,
            pickupLng: 78.3808,
            dropAddress: 'Malakpet Gunj, Old City, Hyderabad',
            dropLat: 17.3753,
            dropLng: 78.4983,
            tripType: 'One Way',
            hasEscort: false,
            pickupDate: todayStr,
            pickupTime: '06:30 PM',
            reportingDateTime: DateTime(now.year, now.month, now.day, 18, 30),
            distanceKm: 21.4,
            durationMinutes: 45,
            formattedDistance: '21.4 km',
            formattedEta: '45 mins',
            estimatedFare: 850.0,
          ),
          CabCartItem(
            id: 'sample_cab_2',
            vehicleType: 'SUV',
            vehicleLabel: 'SUV 7 Seater',
            passengers: 7,
            direction: 'OUTBOUND_FROM_OFFICE',
            officeHubId: 'HITEC_NANAKRAMGUDA',
            officeAddress: 'Cyber Towers, HITEC City, Hyderabad',
            officeLat: 17.4504,
            officeLng: 78.3808,
            localityName: 'Dilsukhnagar / Malakpet',
            pickupAddress: 'Cyber Towers, HITEC City, Hyderabad',
            pickupLat: 17.4504,
            pickupLng: 78.3808,
            dropAddress: 'Dilsukhnagar Metro Station, Malakpet, Hyderabad',
            dropLat: 17.3688,
            dropLng: 78.5247,
            tripType: 'One Way',
            hasEscort: false,
            pickupDate: todayStr,
            pickupTime: '07:00 PM',
            reportingDateTime: DateTime(now.year, now.month, now.day, 19, 0),
            distanceKm: 23.8,
            durationMinutes: 50,
            formattedDistance: '23.8 km',
            formattedEta: '50 mins',
            estimatedFare: 1150.0,
          ),
          CabCartItem(
            id: 'sample_cab_3',
            vehicleType: 'SEDAN',
            vehicleLabel: 'Prime Sedan',
            passengers: 3,
            direction: 'OUTBOUND_FROM_OFFICE',
            officeHubId: 'HITEC_NANAKRAMGUDA',
            officeAddress: 'Mindspace IT Park, Madhapur, Hyderabad',
            officeLat: 17.4411,
            officeLng: 78.3789,
            localityName: 'Chanchalguda / Malakpet',
            pickupAddress: 'Mindspace IT Park, Madhapur, Hyderabad',
            pickupLat: 17.4411,
            pickupLng: 78.3789,
            dropAddress: 'Chanchalguda Junction, Malakpet, Hyderabad',
            dropLat: 17.3712,
            dropLng: 78.4950,
            tripType: 'One Way',
            hasEscort: true,
            pickupDate: todayStr,
            pickupTime: '08:15 PM',
            reportingDateTime: DateTime(now.year, now.month, now.day, 20, 15),
            distanceKm: 22.1,
            durationMinutes: 48,
            formattedDistance: '22.1 km',
            formattedEta: '48 mins',
            estimatedFare: 1280.0,
          ),
          CabCartItem(
            id: 'sample_cab_4',
            vehicleType: 'SUV',
            vehicleLabel: 'SUV 7 Seater',
            passengers: 7,
            direction: 'INBOUND_TO_OFFICE',
            officeHubId: 'HITEC_NANAKRAMGUDA',
            officeAddress: 'Financial District, Nanakramguda, Hyderabad',
            officeLat: 17.4123,
            officeLng: 78.3412,
            localityName: 'Saidabad / Malakpet',
            pickupAddress: 'Saidabad Colony, Malakpet, Hyderabad',
            pickupLat: 17.3620,
            pickupLng: 78.5020,
            dropAddress: 'Financial District, Nanakramguda, Hyderabad',
            dropLat: 17.4123,
            dropLng: 78.3412,
            tripType: 'One Way',
            hasEscort: false,
            pickupDate: todayStr,
            pickupTime: '08:30 AM',
            reportingDateTime: DateTime(now.year, now.month, now.day, 8, 30),
            distanceKm: 24.5,
            durationMinutes: 52,
            formattedDistance: '24.5 km',
            formattedEta: '52 mins',
            estimatedFare: 1200.0,
          ),
          CabCartItem(
            id: 'sample_cab_5',
            vehicleType: 'SEDAN',
            vehicleLabel: 'Prime Sedan',
            passengers: 4,
            direction: 'INBOUND_TO_OFFICE',
            officeHubId: 'HITEC_NANAKRAMGUDA',
            officeAddress: 'Cyber Towers, HITEC City, Hyderabad',
            officeLat: 17.4504,
            officeLng: 78.3808,
            localityName: 'Moosarambagh / Malakpet',
            pickupAddress: 'Moosarambagh Metro Station, Malakpet, Hyderabad',
            pickupLat: 17.3780,
            pickupLng: 78.5110,
            dropAddress: 'Cyber Towers, HITEC City, Hyderabad',
            dropLat: 17.4504,
            dropLng: 78.3808,
            tripType: 'One Way',
            hasEscort: false,
            pickupDate: todayStr,
            pickupTime: '09:00 AM',
            reportingDateTime: DateTime(now.year, now.month, now.day, 9, 0),
            distanceKm: 22.0,
            durationMinutes: 47,
            formattedDistance: '22.0 km',
            formattedEta: '47 mins',
            estimatedFare: 870.0,
          ),
        ],
      ),
    ];
  }
}
