import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static SupabaseService? _instance;
  static SupabaseService get instance => _instance ??= SupabaseService._();

  SupabaseService._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://ybqxhawowjktupfizfod.supabase.co',
  );
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXhoYXdvd2prdHVwZml6Zm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTQ5OTgsImV4cCI6MjEwMzQzMDk5OH0.grjHadhTvuvcyLsF7CNoY4U73cL1bI3vJOsBaV4Bj1Q',
  );

  static bool _initialized = false;
  static bool get isInitialized => _initialized;

  // Initialize Supabase - call this in main()
  static Future<void> initialize() async {
    if (_initialized) return;
    try {
      await Supabase.initialize(
        url: supabaseUrl.isNotEmpty ? supabaseUrl : 'https://ybqxhawowjktupfizfod.supabase.co',
        anonKey: supabaseAnonKey.isNotEmpty ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicXhoYXdvd2prdHVwZml6Zm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTQ5OTgsImV4cCI6MjEwMzQzMDk5OH0.grjHadhTvuvcyLsF7CNoY4U73cL1bI3vJOsBaV4Bj1Q',
      );
      _initialized = true;
    } catch (e) {
      debugPrint('Supabase optional fallback init: $e');
    }
  }

  // Get Supabase client
  SupabaseClient? get client => _initialized ? Supabase.instance.client : null;
}
