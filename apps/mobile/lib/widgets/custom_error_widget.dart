import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../core/utils/app_logger.dart';
import '../routes/app_routes.dart';
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
  void initState() {
    super.initState();
    AppLogger.error(
      'CustomErrorWidget caught runtime exception: ${widget.errorDetails.exceptionAsString()}',
      tag: 'ERROR_WIDGET',
      error: widget.errorDetails.exception,
      stackTrace: widget.errorDetails.stack,
    );
  }

  void _copyErrorToClipboard() {
    final text = 'AdhocX Exception:\n${widget.errorDetails.exceptionAsString()}\n\nStack:\n${widget.errorDetails.stack}';
    Clipboard.setData(ClipboardData(text: text));
    Fluttertoast.showToast(
      msg: 'Error details copied to clipboard',
      backgroundColor: AppColors.success,
      textColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.bgDark,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
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
                  'Please go back or return to home. If the issue persists, contact support.',
                  style: TextStyle(color: AppColors.textMutedDark, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (Navigator.canPop(context)) ...[
                      ElevatedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_rounded, size: 18),
                        label: const Text('Go Back'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.surfaceElevatedDark,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    ElevatedButton.icon(
                      onPressed: () {
                        try {
                          context.go(AppRoutes.userHomeScreen);
                        } catch (_) {
                          if (Navigator.canPop(context)) {
                            Navigator.pop(context);
                          }
                        }
                      },
                      icon: const Icon(Icons.home_rounded, size: 18),
                      label: const Text('Return Home'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextButton.icon(
                  onPressed: () => setState(() => _showDetails = !_showDetails),
                  icon: Icon(
                    _showDetails ? Icons.expand_less : Icons.expand_more,
                    size: 16,
                    color: AppColors.slate400,
                  ),
                  label: Text(
                    _showDetails ? 'Hide Error Details' : 'Show Error Details',
                    style: const TextStyle(color: AppColors.slate400, fontSize: 12),
                  ),
                ),
                if (_showDetails) ...[
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(12),
                    constraints: const BoxConstraints(maxHeight: 220),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        widget.errorDetails.exceptionAsString(),
                        style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: _copyErrorToClipboard,
                    icon: const Icon(Icons.copy_rounded, size: 14, color: AppColors.primary),
                    label: const Text(
                      'Copy Error Details',
                      style: TextStyle(color: AppColors.primary, fontSize: 12),
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

