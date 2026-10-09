import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../shared/theme/app_colors.dart';

class CustomErrorWidget extends StatefulWidget {
  final FlutterErrorDetails errorDetails;

  const CustomErrorWidget({super.key, required this.errorDetails});

  @override
  State<CustomErrorWidget> createState() => _CustomErrorWidgetState();
}

class _CustomErrorWidgetState extends State<CustomErrorWidget> {
  bool _showDetails = false;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.bgDark,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  color: AppColors.error,
                  size: 56,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Something went wrong',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Please go back or restart the screen. If the issue persists, contact support.',
                  style: TextStyle(color: AppColors.textMutedDark, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context);
                    }
                  },
                  icon: const Icon(Icons.arrow_back_rounded, size: 18),
                  label: const Text('Go Back'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                ),
                if (kDebugMode) ...[
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => setState(() => _showDetails = !_showDetails),
                    child: Text(
                      _showDetails ? 'Hide Error Details' : 'Show Error Details',
                      style: const TextStyle(color: AppColors.slate400, fontSize: 12),
                    ),
                  ),
                  if (_showDetails)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Text(
                        widget.errorDetails.exceptionAsString(),
                        style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
