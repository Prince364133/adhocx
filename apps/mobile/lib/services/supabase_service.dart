import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseService? _instance;
  static SupabaseService get instance => _instance ??= SupabaseService._();

  SupabaseService._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://placeholder.supabase.co',
  );
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'placeholder-anon-key',
  );

  static bool _initialized = false;
  static bool get isInitialized => _initialized;

  // Initialize Supabase - call this in main()
  static Future<void> initialize() async {
    if (_initialized) return;
    try {
      await Supabase.initialize(
        url: supabaseUrl.isNotEmpty ? supabaseUrl : 'https://placeholder.supabase.co',
        anonKey: supabaseAnonKey.isNotEmpty ? supabaseAnonKey : 'placeholder-anon-key',
      );
      _initialized = true;
    } catch (e) {
      debugPrint('Supabase optional fallback init: $e');
    }
  }

  // Get Supabase client
  SupabaseClient? get client => _initialized ? Supabase.instance.client : null;
}
