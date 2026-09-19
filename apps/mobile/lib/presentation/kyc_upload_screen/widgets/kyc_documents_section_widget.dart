import 'package:adhocx/shared/theme/app_colors.dart';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class KycDocumentsSectionWidget extends StatefulWidget {
  final Map<String, String?> uploadedDocs;
  final void Function(String key, String filePath, Uint8List fileBytes) onDocUploaded;

  const KycDocumentsSectionWidget({
    super.key,
    required this.uploadedDocs,
    required this.onDocUploaded,
  });

  @override
  State<KycDocumentsSectionWidget> createState() =>
      _KycDocumentsSectionWidgetState();
}

class _KycDocumentsSectionWidgetState extends State<KycDocumentsSectionWidget> {
  final ImagePicker _picker = ImagePicker();
  String? _loadingKey;

  static const List<Map<String, String>> _docList = [
    {'key': 'dl_front', 'label': 'Driver License (Front)'},
    {'key': 'dl_back', 'label': 'Driver License (Back)'},
    {'key': 'rc_book', 'label': 'Vehicle RC Book'},
    {'key': 'insurance', 'label': 'Commercial Insurance'},
    {'key': 'aadhaar_doc', 'label': 'Aadhaar Card'},
  ];

  Future<void> _pickDocument(String key, ImageSource source) async {
    Navigator.pop(context); // Close the bottom sheet

    setState(() => _loadingKey = key);

    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        imageQuality: 85,
      );

      if (file != null) {
        final Uint8List fileBytes = await file.readAsBytes();
        widget.onDocUploaded(key, file.path, fileBytes);
      }
    } catch (e) {
      debugPrint('Error picking document for $key: $e');
    } finally {
      if (mounted) {
        setState(() => _loadingKey = null);
      }
    }
  }

  void _showSourcePicker(String docKey, String docLabel) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Upload $docLabel',
                  style: TextStyle(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Select an image source',
                  style: TextStyle(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 18),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.successContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.camera_alt_outlined,
                      color: AppColors.success,
                    ),
                  ),
                  title: Text(
                    'Take Photo with Camera',
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onTap: () => _pickDocument(docKey, ImageSource.camera),
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.successContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.photo_library_outlined,
                      color: AppColors.success,
                    ),
                  ),
                  title: Text(
                    'Choose from Gallery / Photos',
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onTap: () => _pickDocument(docKey, ImageSource.gallery),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white12 : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.successContainer,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Center(
                  child: Text(
                    '5',
                    style: TextStyle(
                      color: AppColors.success,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Document Uploads',
                style: TextStyle(
                  color: AppColors.success,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Photo or PDF — tap to upload from camera or files',
            style: TextStyle(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          ..._docList.map((doc) {
            final key = doc['key']!;
            final label = doc['label']!;
            final isUploaded = widget.uploadedDocs[key] != null;
            final isLoading = _loadingKey == key;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _DocUploadRow(
                isDark: isDark,
                label: label,
                isUploaded: isUploaded,
                isLoading: isLoading,
                onUpload: () => _showSourcePicker(key, label),
                onReplace: () => _showSourcePicker(key, label),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _DocUploadRow extends StatelessWidget {
  final bool isDark;
  final String label;
  final bool isUploaded;
  final bool isLoading;
  final VoidCallback onUpload;
  final VoidCallback onReplace;

  const _DocUploadRow({
    required this.isDark,
    required this.label,
    required this.isUploaded,
    required this.isLoading,
    required this.onUpload,
    required this.onReplace,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (isUploaded)
                const Text(
                  'Uploaded ✓',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        if (!isUploaded)
          _uploadBtn(
            label: 'Upload',
            color: AppColors.success,
            onTap: onUpload,
          )
        else
          _uploadBtn(
            label: 'Replace',
            color: isDark ? AppColors.slate400 : AppColors.textSecondaryLight,
            onTap: onReplace,
          ),
      ],
    );
  }

  Widget _uploadBtn({
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: isLoading
            ? SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: color),
              )
            : Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}