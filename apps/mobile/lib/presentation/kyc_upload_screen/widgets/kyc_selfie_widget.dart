import 'package:adhocx/shared/theme/app_colors.dart';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class KycSelfieWidget extends StatefulWidget {
  final String? selfieUrl;
  final ValueChanged<String?> onSelfieChanged;

  const KycSelfieWidget({
    super.key,
    this.selfieUrl,
    required this.onSelfieChanged,
  });

  @override
  State<KycSelfieWidget> createState() => _KycSelfieWidgetState();
}

class _KycSelfieWidgetState extends State<KycSelfieWidget> {
  XFile? _capturedImage;
  bool _isLoading = false;
  final ImagePicker _picker = ImagePicker();

  bool get _hasCaptured => _capturedImage != null || widget.selfieUrl != null;

  Future<void> _takeSelfie() async {
    setState(() => _isLoading = true);

    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 80,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      if (photo != null) {
        final user = Supabase.instance.client.auth.currentUser;
        if (user == null) {
          throw Exception('User not authenticated. Please log in again.');
        }

        debugPrint('--- KYC Selfie Upload Debug ---');
        debugPrint('Authenticated User ID: ${user.id}');
        
        final fileName = '${user.id}/profile_selfie.jpg';
        debugPrint('Target Storage Path: $fileName');

        // Read bytes directly for reliable cross-platform uploading
        final Uint8List fileBytes = await photo.readAsBytes();

        await Supabase.instance.client.storage
            .from('kyc-documents')
            .uploadBinary(
              fileName,
              fileBytes,
              fileOptions: const FileOptions(
                upsert: true,
                contentType: 'image/jpeg',
              ),
            );

        final publicUrl = Supabase.instance.client.storage
            .from('kyc-documents')
            .getPublicUrl(fileName);

        setState(() {
          _capturedImage = photo;
        });

        widget.onSelfieChanged(publicUrl);
        debugPrint('Selfie upload completed successfully.');
      }
    } catch (e) {
      debugPrint("Error capturing or uploading selfie: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload selfie: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _retake() {
    setState(() {
      _capturedImage = null;
    });
    widget.onSelfieChanged(null);
  }

  ImageProvider? _getImageProvider() {
    if (_capturedImage != null) {
      if (kIsWeb) {
        return NetworkImage(_capturedImage!.path);
      } else {
        return FileImage(File(_capturedImage!.path));
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return _buildSection(
      title: 'Driver Selfie',
      sectionNumber: '0',
      child: Row(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.surfaceDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _hasCaptured ? AppColors.success : Colors.white24,
                width: _hasCaptured ? 2 : 1,
              ),
              image: _capturedImage != null
                  ? DecorationImage(
                      image: _getImageProvider()!,
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: _capturedImage != null
                ? null
                : (_hasCaptured
                    ? const Icon(
                        Icons.check_circle_rounded,
                        color: AppColors.success,
                        size: 36,
                      )
                    : const Icon(
                        Icons.person_outline_rounded,
                        color: Colors.white54,
                        size: 36,
                      )),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!_hasCaptured) ...[
                  _actionButton(
                    label: _isLoading ? 'Uploading...' : 'Take Selfie',
                    icon: Icons.camera_alt_outlined,
                    color: AppColors.success,
                    isLoading: _isLoading,
                    onTap: _isLoading ? () {} : _takeSelfie,
                  ),
                ] else ...[
                  Row(
                    children: [
                      Expanded(
                        child: _actionButton(
                          label: 'Retake',
                          icon: Icons.refresh_rounded,
                          color: Colors.white70,
                          isLoading: false,
                          onTap: _retake,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _actionButton(
                          label: 'Captured',
                          icon: Icons.check_rounded,
                          color: AppColors.success,
                          isLoading: false,
                          onTap: () {},
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 6),
                const Text(
                  'Face clearly visible, good lighting',
                  style: TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionButton({
    required String label,
    required IconData icon,
    required Color color,
    required bool isLoading,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading) ...[
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: color),
              ),
              const SizedBox(width: 6),
            ] else ...[
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _buildSection({
  required String title,
  required String sectionNumber,
  required Widget child,
}) {
  return Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.black,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Colors.white24),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: AppColors.success,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Center(
                child: Text(
                  sectionNumber,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.success,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        child,
      ],
    ),
  );
}