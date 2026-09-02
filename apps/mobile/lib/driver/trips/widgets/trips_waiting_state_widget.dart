import 'package:flutter/material.dart';

class TripsWaitingStateWidget extends StatefulWidget {
  const TripsWaitingStateWidget({super.key});

  @override
  State<TripsWaitingStateWidget> createState() =>
      _TripsWaitingStateWidgetState();
}

class _TripsWaitingStateWidgetState extends State<TripsWaitingStateWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1400),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(
      begin: 0.4,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: const Color(0xFF1e293b),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF10b981).withAlpha(77)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _pulseAnim,
                builder: (context, child) {
                  return Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(
                        0xFF10b981,
                      ).withValues(alpha: 0.1 * _pulseAnim.value),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(
                          0xFF10b981,
                        ).withValues(alpha: 0.4 * _pulseAnim.value),
                        width: 2,
                      ),
                    ),
                    child: const Icon(
                      Icons.power_settings_new_rounded,
                      color: Color(0xFF10b981),
                      size: 40,
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
              const Text(
                'Waiting for trips…',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Trip alerts will appear here when available',
                style: TextStyle(color: Color(0xFF94a3b8), fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(3, (i) {
                  return AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      final delay = i * 0.3;
                      final value = ((_controller.value - delay) % 1.0).clamp(
                        0.0,
                        1.0,
                      );
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10b981).withValues(alpha: value),
                          shape: BoxShape.circle,
                        ),
                      );
                    },
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
