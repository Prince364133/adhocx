import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart'; // <-- Added Supabase import

import './widgets/active_trip_card_widget.dart';
import './widgets/otp_dialog_widget.dart';
import './widgets/trip_alert_modal_widget.dart';
import './widgets/trips_header_widget.dart';
import './widgets/trips_offline_state_widget.dart';
import './widgets/trips_waiting_state_widget.dart';

enum DriverOnlineState { offline, onlineWaiting, activeTrip }

enum TripStatus { assigned, arrived, inProgress }

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  // Dynamic state variables for the header
  String _driverName = 'Loading...';
  String _vehicleNum = '';
  String _vehicleType = '';

  // TODO: Replace with [Riverpod/Bloc] for production
  DriverOnlineState _onlineState = DriverOnlineState.offline;
  TripStatus _tripStatus = TripStatus.assigned;
  bool _showTripAlert = false;
  bool _gpsGranted = true;

  final Map<String, dynamic> _activeTrip = {
    'id': 'TRIP-HYD-20240825-0047',
    'pickup': '12, Jubilee Hills Road No. 36, Hyderabad',
    'drop': 'Rajiv Gandhi International Airport, Shamshabad',
    'payout': 1050,
    'distance': '38.4 km',
    'vehicle_type': 'SUV',
    'status': 'assigned',
    'passenger_name': 'Arjun Mehta',
    'passenger_phone': '+91 98765 43210',
  };

  final Map<String, dynamic> _broadcastTrip = {
    'id': 'TRIP-HYD-20240825-0052',
    'pickup': 'Hitech City Metro Station, Madhapur',
    'drop': 'Inorbit Mall, Cyberabad',
    'payout': 500,
    'distance': '8.2 km',
    'vehicle_type': 'Sedan',
  };

  @override
  void initState() {
    super.initState();
    _fetchDriverProfile(); // Fetch the real user data when screen loads
  }

  // Fetch the real name and vehicle details from Supabase
  Future<void> _fetchDriverProfile() async {
    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      
      if (user != null) {
        final response = await supabase
            .from('driver_profiles')
            .select('full_name, vehicle_number, vehicle_type')
            .eq('user_id', user.id)
            .maybeSingle();

        if (response != null && mounted) {
          setState(() {
            _driverName = response['full_name'] ?? 'Unknown Driver';
            _vehicleNum = response['vehicle_number'] ?? 'N/A';
            _vehicleType = response['vehicle_type'] ?? 'N/A';
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading driver header details: $e');
    }
  }

  void _toggleOnline() {
    setState(() {
      if (_onlineState == DriverOnlineState.offline) {
        _onlineState = DriverOnlineState.onlineWaiting;
        // Simulate incoming trip alert after 2 seconds
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted && _onlineState == DriverOnlineState.onlineWaiting) {
            setState(() => _showTripAlert = true);
          }
        });
      } else if (_onlineState == DriverOnlineState.onlineWaiting) {
        _onlineState = DriverOnlineState.offline;
        _showTripAlert = false;
      }
    });
  }

  void _acceptTrip() {
    // TODO: Replace with Supabase RPC accept_trip_atomic(p_trip_id, p_driver_id) for production
    setState(() {
      _showTripAlert = false;
      _onlineState = DriverOnlineState.activeTrip;
      _tripStatus = TripStatus.assigned;
    });
  }

  void _declineTrip() {
    setState(() => _showTripAlert = false);
  }

  void _onTripAction() {
    switch (_tripStatus) {
      case TripStatus.assigned:
        // Navigate to pickup — opens Google Maps in production
        setState(() => _tripStatus = TripStatus.arrived);
        break;
      case TripStatus.arrived:
        _showOtpDialog(isStart: true);
        break;
      case TripStatus.inProgress:
        _showOtpDialog(isStart: false);
        break;
    }
  }

  void _showOtpDialog({required bool isStart}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => OtpDialogWidget(
        isStart: isStart,
        onConfirm: (otp) {
          Navigator.of(context).pop();
          if (isStart) {
            // TODO: Replace with Supabase UPDATE trips.status = 'in_progress' for production
            setState(() => _tripStatus = TripStatus.inProgress);
          } else {
            // TODO: Replace with Supabase RPC complete_trip_with_otp for production
            setState(() {
              _onlineState = DriverOnlineState.onlineWaiting;
              _tripStatus = TripStatus.assigned;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Trip completed! ₹${_activeTrip['payout']} credited to your wallet.',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ],
                ),
                backgroundColor: const Color(0xFF10b981),
                duration: const Duration(seconds: 3),
              ),
            );
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                TripsHeaderWidget(
                  isOnline: _onlineState != DriverOnlineState.offline,
                  hasActiveTrip: _onlineState == DriverOnlineState.activeTrip,
                  // Dynamically injected variables instead of hardcoded strings
                  driverName: _driverName, 
                  vehicleNumber: _vehicleNum, 
                  vehicleType: _vehicleType, 
                  onToggleOnline: _toggleOnline,
                ),
                if (!_gpsGranted && _onlineState != DriverOnlineState.offline)
                  _buildGpsBanner(),
                Expanded(child: _buildBody()),
              ],
            ),
            if (_showTripAlert)
              TripAlertModalWidget(
                trip: _broadcastTrip,
                onAccept: _acceptTrip,
                onDecline: _declineTrip,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGpsBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: const Color(0xFFf59e0b).withAlpha(31),
      child: Row(
        children: [
          const Icon(
            Icons.location_off_rounded,
            color: Color(0xFFf59e0b),
            size: 16,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'GPS Permission Required · Enable location to receive trips',
              style: TextStyle(color: Color(0xFFf59e0b), fontSize: 12),
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _gpsGranted = true),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFf59e0b),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'Grant',
                style: TextStyle(
                  color: Color(0xFF1a0a00),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    return switch (_onlineState) {
      DriverOnlineState.offline => const TripsOfflineStateWidget(),
      DriverOnlineState.onlineWaiting => const TripsWaitingStateWidget(),
      DriverOnlineState.activeTrip => ActiveTripCardWidget(
        trip: _activeTrip,
        tripStatus: _tripStatus,
        onAction: _onTripAction,
        onArrivedAtPickup: () =>
            setState(() => _tripStatus = TripStatus.arrived),
      ),
    };
  }
}