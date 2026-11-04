import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 3: SOS - Alert Confirmed
class SosAlertConfirmedScreen extends StatefulWidget {
  const SosAlertConfirmedScreen({super.key});

  @override
  State<SosAlertConfirmedScreen> createState() => _SosAlertConfirmedScreenState();
}

class _SosAlertConfirmedScreenState extends State<SosAlertConfirmedScreen> {
  Map<String, dynamic>? _sosData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final safety = await MockDataService.getSafetyData();
    if (mounted) {
      setState(() {
        _sosData = safety['sos_alert'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _sosData?['title'] ?? 'SOS Alert Sent';
    final message = _sosData?['message'] ??
        'Our safety team has been notified and is contacting you shortly.';
    final liveMsg = _sosData?['liveAssistance'] ??
        'You will receive a call from our safety team in a few moments.';

    return Scaffold(
      backgroundColor: const Color(0xFF1E293B), // Charcoal emergency response theme
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.white70),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    // Green verified check badge
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        color: Color(0xFF16A34A),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(Icons.check_rounded, color: Colors.white, size: 44),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.white70,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Live Assistance Callout Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFEF4444)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.headset_mic_rounded, color: Color(0xFFFCA5A5), size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Live Assistance',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  liveMsg,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Status Timeline Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: Column(
                        children: [
                          _buildStepRow('Alert Received', '9:41 AM', isDone: true),
                          const Divider(color: Colors.white12, height: 20),
                          _buildStepRow('Team Assigned', 'In Progress', isActive: true),
                          const Divider(color: Colors.white12, height: 20),
                          _buildStepRow('In Contact', 'Pending'),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Action: Simulate incoming call
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => context.push(AppRoutes.safetyTeamCall),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        child: Text(
                          'Stay on This Screen (Incoming Call)',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStepRow(String title, String status, {bool isDone = false, bool isActive = false}) {
    return Row(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: isDone ? const Color(0xFF16A34A) : isActive ? const Color(0xFF2563EB) : Colors.white24,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check, size: 12, color: Colors.white)
                : isActive
                    ? Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle))
                    : null,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
          ),
        ),
        Text(
          status,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDone ? const Color(0xFF4ADE80) : isActive ? const Color(0xFF60A5FA) : Colors.white38,
          ),
        ),
      ],
    );
  }
}

