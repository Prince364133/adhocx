import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/networking/api_client.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../core/utils/app_toast.dart';

/// Screen 4: Document Details Vault — dynamic, live API integrated with auto-resolution & re-upload.
class DocumentDetailsScreen extends StatefulWidget {
  const DocumentDetailsScreen({super.key});

  @override
  State<DocumentDetailsScreen> createState() => _DocumentDetailsScreenState();
}

class _DocumentDetailsScreenState extends State<DocumentDetailsScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = true;
  bool _isUploading = false;
  Map<String, dynamic> _profile = {};

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await DriverService.instance.getProfile(forceRefresh: true);
      if (mounted && res is Map) {
        setState(() {
          _profile = Map<String, dynamic>.from(res);
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Converts relative, base64, localhost, or CDN image paths into fully-qualified URLs.
  static String resolveDocumentUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return '';
    final trimmed = rawUrl.trim();

    // Base64 Data URI
    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }

    // Absolute HTTP(S) URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (trimmed.contains('localhost') || trimmed.contains('127.0.0.1')) {
        return trimmed.replaceAll(
          RegExp(r'http://(localhost|127\.0\.0\.1)(:\d+)?'),
          'https://api.adhocx.com',
        );
      }
      return trimmed;
    }

    // Relative path (e.g. /uploads/uuid.jpg, uploads/uuid.jpg, /documents/uuid.jpg)
    final cleanPath = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    final apiBase = ApiClient.instance.baseUrl.replaceAll('/api/v1', '');
    return '$apiBase$cleanPath';
  }

  Future<void> _showUploadSourcePicker(String docType, String docTitle) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
              Text(
                'Upload $docTitle',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(Icons.camera_alt_rounded, color: isDark ? AppColors.primaryLight : AppColors.primary),
                ),
                title: Text(
                  'Take Photo with Camera',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  'Capture document photo directly',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadDocument(docType, docTitle, ImageSource.camera);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(Icons.photo_library_rounded, color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark),
                ),
                title: Text(
                  'Choose from Gallery / Files',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  'Select existing photo from storage',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadDocument(docType, docTitle, ImageSource.gallery);
                },
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadDocument(
    String docType,
    String docTitle,
    ImageSource source,
  ) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (pickedFile == null) return;
      if (!mounted) return;

      setState(() => _isUploading = true);
      AppToast.showInfo('Uploading $docTitle...', context: context);

      final bytes = await pickedFile.readAsBytes();
      final ext = pickedFile.name.split('.').last.toLowerCase();
      final mimeType = (ext == 'png') ? 'image/png' : 'image/jpeg';
      final filename = '${docType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}.$ext';

      await DriverService.instance.uploadKycDocument(
        documentType: docType,
        fileBytes: bytes,
        filename: filename,
        mimeType: mimeType,
      );

      if (mounted) {
        AppToast.showSuccess('$docTitle uploaded successfully!', context: context);
        await _loadProfile();
      }
    } catch (e) {
      if (mounted) {
        final cleanMsg = AppToast.cleanErrorMessage(e);
        AppToast.showError('Upload failed: $cleanMsg', context: context);
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  void _showDocumentPreview(String title, String? rawFileUrl, {required String docType}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolvedUrl = resolveDocumentUrl(rawFileUrl);

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Dialog(
          backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: Container(
                    constraints: const BoxConstraints(maxHeight: 280),
                    color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                    alignment: Alignment.center,
                    child: _buildPreviewImage(
                      title: title,
                      resolvedUrl: resolvedUrl,
                      docType: docType,
                      isDark: isDark,
                      onReuploadSuccess: () {
                        Navigator.of(ctx).pop();
                        _showUploadSourcePicker(docType, title);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          foregroundColor: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          side: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          _showUploadSourcePicker(docType, title);
                        },
                        icon: const Icon(Icons.camera_alt_outlined, size: 18),
                        label: Text(resolvedUrl.isEmpty ? 'Upload Photo' : 'Re-upload'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        onPressed: () => Navigator.of(ctx).pop(),
                        child: const Text('Done'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewImage({
    required String title,
    required String resolvedUrl,
    required String docType,
    required bool isDark,
    required VoidCallback onReuploadSuccess,
  }) {
    if (resolvedUrl.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.upload_file_outlined, size: 52, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            const SizedBox(height: 10),
            Text(
              'No photo uploaded yet for $title',
              textAlign: TextAlign.center,
              style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              'Upload a clear document image to verify your details.',
              textAlign: TextAlign.center,
              style: AppTypography.caption(color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
              ),
              onPressed: onReuploadSuccess,
              icon: const Icon(Icons.add_a_photo_outlined, size: 18),
              label: Text('Upload $title'),
            ),
          ],
        ),
      );
    }

    // Base64 image
    if (resolvedUrl.startsWith('data:image')) {
      try {
        final commaIdx = resolvedUrl.indexOf(',');
        final base64String = commaIdx != -1 ? resolvedUrl.substring(commaIdx + 1) : resolvedUrl;
        final bytes = base64Decode(base64String.replaceAll(RegExp(r'\s+'), ''));
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => _buildErrorFallback(title, isDark, onReuploadSuccess),
        );
      } catch (_) {
        return _buildErrorFallback(title, isDark, onReuploadSuccess);
      }
    }

    // Network Image
    return Image.network(
      resolvedUrl,
      fit: BoxFit.contain,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        final totalBytes = loadingProgress.expectedTotalBytes;
        final loadedBytes = loadingProgress.cumulativeBytesLoaded;
        final progress = (totalBytes != null && totalBytes > 0) ? loadedBytes / totalBytes : null;
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: CircularProgressIndicator(value: progress, color: AppColors.primary),
          ),
        );
      },
      errorBuilder: (_, error, __) {
        return _buildErrorFallback(title, isDark, onReuploadSuccess);
      },
    );
  }

  Widget _buildErrorFallback(String title, bool isDark, VoidCallback onReupload) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.broken_image_outlined, size: 48, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          const SizedBox(height: 10),
          Text(
            'Unable to load document image',
            textAlign: TextAlign.center,
            style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'The file could not be retrieved from the server. You can re-upload a fresh photo.',
            textAlign: TextAlign.center,
            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
            ),
            onPressed: onReupload,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Re-upload Document'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final user = AuthService.instance.currentUser;
    final driverProf = user?.driverProfile ?? {};
    final kycDocs = (_profile['kycDocuments'] is Map ? _profile['kycDocuments'] as Map : null) ??
                    (driverProf['kycDocuments'] is Map ? driverProf['kycDocuments'] as Map : null) ?? {};

    final status = (_profile['verificationStatus'] ?? driverProf['verificationStatus'] ?? user?.verificationStatus ?? 'PENDING').toString().toUpperCase();
    final isVerified = status == 'VERIFIED' || status == 'APPROVED';
    final isUnderReview = status == 'UNDER_REVIEW';

    final String verifiedStatusText = isVerified ? 'Verified' : (isUnderReview ? 'Under Review' : 'Pending');

    final dlUrl = _profile['dlFrontUrl'] ?? driverProf['dlFrontUrl'] ?? kycDocs['dlFrontUrl'];
    final aadharUrl = _profile['aadharFrontUrl'] ?? _profile['aadharBackUrl'] ?? driverProf['aadharFrontUrl'] ?? driverProf['aadharBackUrl'] ?? kycDocs['aadharFrontUrl'] ?? kycDocs['aadharBackUrl'];
    final panUrl = _profile['panDocUrl'] ?? driverProf['panDocUrl'] ?? kycDocs['panDocUrl'];
    final rcFrontUrl = _profile['rcFrontUrl'] ?? _profile['rcDocUrl'] ?? driverProf['rcFrontUrl'] ?? driverProf['rcDocUrl'] ?? kycDocs['rcFrontUrl'] ?? kycDocs['rcDocUrl'];
    final rcBackUrl = _profile['rcBackUrl'] ?? driverProf['rcBackUrl'] ?? kycDocs['rcBackUrl'];
    final insUrl = _profile['insuranceDocUrl'] ?? driverProf['insuranceDocUrl'] ?? kycDocs['insuranceDocUrl'];
    final vehUrl = _profile['vehiclePhotoUrl'] ?? driverProf['vehiclePhotoUrl'] ?? kycDocs['vehiclePhotoUrl'];
    final photoUrl = _profile['profilePhotoUrl'] ?? driverProf['profilePhotoUrl'] ?? kycDocs['profilePhotoUrl'] ?? user?.photoUrl;

    final docs = [
      {
        'title': 'Profile Photo / Selfie',
        'docType': 'PROFILE_PHOTO',
        'docNumber': (photoUrl != null && photoUrl.toString().isNotEmpty) ? 'Profile Verified' : '—',
        'status': (photoUrl != null && photoUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.account_circle_outlined,
        'fileUrl': photoUrl?.toString(),
      },
      {
        'title': 'Driving License',
        'docType': 'DRIVING_LICENSE',
        'docNumber': _profile['licenseNumber'] ?? (dlUrl != null ? 'Uploaded' : '—'),
        'status': (dlUrl != null && dlUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': _profile['licenseExpiry'] ?? 'Active',
        'icon': Icons.badge_outlined,
        'fileUrl': dlUrl?.toString(),
      },
      {
        'title': 'Aadhaar Card',
        'docType': 'AADHAR_FRONT',
        'docNumber': (aadharUrl != null && aadharUrl.toString().isNotEmpty) ? 'Verified Document' : '—',
        'status': (aadharUrl != null && aadharUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.credit_card_outlined,
        'fileUrl': aadharUrl?.toString(),
      },
      {
        'title': 'PAN Card',
        'docType': 'PAN_CARD',
        'docNumber': _profile['panNumber'] ?? (panUrl != null ? 'Uploaded' : '—'),
        'status': (panUrl != null && panUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.account_balance_wallet_outlined,
        'fileUrl': panUrl?.toString(),
      },
      {
        'title': 'Vehicle Registration (RC Front)',
        'docType': 'RC_FRONT',
        'docNumber': _profile['vehiclePlate'] ?? (rcFrontUrl != null ? 'Uploaded' : '—'),
        'status': (rcFrontUrl != null && rcFrontUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Active',
        'icon': Icons.directions_car_outlined,
        'fileUrl': rcFrontUrl?.toString(),
      },
      {
        'title': 'Vehicle Registration (RC Back)',
        'docType': 'RC_BACK',
        'docNumber': _profile['vehiclePlate'] ?? (rcBackUrl != null ? 'Uploaded' : '—'),
        'status': (rcBackUrl != null && rcBackUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Active',
        'icon': Icons.directions_car_outlined,
        'fileUrl': rcBackUrl?.toString(),
      },
      {
        'title': 'Commercial Insurance',
        'docType': 'INSURANCE',
        'docNumber': (insUrl != null && insUrl.toString().isNotEmpty) ? 'Policy on File' : '—',
        'status': (insUrl != null && insUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Active',
        'icon': Icons.security_outlined,
        'fileUrl': insUrl?.toString(),
      },
      {
        'title': 'Vehicle Photo',
        'docType': 'VEHICLE_PHOTO',
        'docNumber': _profile['vehicleModel'] ?? (vehUrl != null ? 'Verified Model' : '—'),
        'status': (vehUrl != null && vehUrl.toString().isNotEmpty) ? verifiedStatusText : 'Not Uploaded',
        'validTill': 'Permanent',
        'icon': Icons.photo_camera_front_outlined,
        'fileUrl': vehUrl?.toString(),
      },
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.kycVerificationScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Document Details',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (_isUploading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),

                // ── Scrollable Document List ────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: _loadProfile,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            itemCount: docs.length,
                            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                            itemBuilder: (context, index) {
                              final doc = docs[index];
                              final hasUrl = doc['fileUrl'] != null && doc['fileUrl'].toString().trim().isNotEmpty;
                              final docStatus = doc['status'] as String;
                              final isDocVerified = docStatus == 'Verified';
                              final isDocUnderReview = docStatus == 'Under Review';
                              final isDocNotUploaded = docStatus == 'Not Uploaded';

                              final Color statusColor = isDocVerified
                                  ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                                  : (isDocUnderReview
                                      ? Colors.amber
                                      : (isDocNotUploaded
                                          ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
                                          : AppColors.primary));

                              return Container(
                                padding: const EdgeInsets.all(AppSpacing.lg),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: isDark ? 0.2 : 0.1),
                                        borderRadius: BorderRadius.circular(AppRadius.md),
                                      ),
                                      child: Icon(
                                        doc['icon'] as IconData,
                                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            doc['title'] as String,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Number: ${doc['docNumber']}',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                          Text(
                                            'Status: ${doc['validTill']}',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: statusColor.withValues(alpha: isDark ? 0.2 : 0.12),
                                            borderRadius: BorderRadius.circular(AppRadius.xs),
                                          ),
                                          child: Text(
                                            docStatus,
                                            style: AppTypography.caption(
                                              color: statusColor,
                                              fontWeight: FontWeight.bold,
                                            ).copyWith(fontSize: 10),
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            if (hasUrl) ...[
                                              GestureDetector(
                                                onTap: () => _showDocumentPreview(
                                                  doc['title'] as String,
                                                  doc['fileUrl'] as String?,
                                                  docType: doc['docType'] as String,
                                                ),
                                                child: Text(
                                                  'View Photo',
                                                  style: AppTypography.caption(
                                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              InkWell(
                                                onTap: () => _showUploadSourcePicker(
                                                  doc['docType'] as String,
                                                  doc['title'] as String,
                                                ),
                                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                                child: Padding(
                                                  padding: const EdgeInsets.all(4),
                                                  child: Icon(
                                                    Icons.camera_alt_outlined,
                                                    size: 16,
                                                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                                  ),
                                                ),
                                              ),
                                            ] else ...[
                                              InkWell(
                                                onTap: () => _showUploadSourcePicker(
                                                  doc['docType'] as String,
                                                  doc['title'] as String,
                                                ),
                                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                                child: Padding(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      Icon(
                                                        Icons.upload_file_outlined,
                                                        size: 14,
                                                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                      ),
                                                      const SizedBox(width: 4),
                                                      Text(
                                                        'Upload',
                                                        style: AppTypography.caption(
                                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                          fontWeight: FontWeight.bold,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
