import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/networking/api_client.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 3: KYC & Verification screen — dynamic, live API integrated with in-page document preview and upload.
class KycVerificationScreen extends StatefulWidget {
  final String? initialFilter;
  const KycVerificationScreen({super.key, this.initialFilter});

  @override
  State<KycVerificationScreen> createState() => _KycVerificationScreenState();
}

class _KycVerificationScreenState extends State<KycVerificationScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = true;
  bool _isUploading = false;
  Map<String, dynamic> _profile = {};
  late String _activeFilter;

  @override
  void initState() {
    super.initState();
    final raw = widget.initialFilter?.trim().toLowerCase();
    if (raw == 'vehicle' || raw == 'vehicles') {
      _activeFilter = 'vehicle';
    } else if (raw == 'identity' || raw == 'profile' || raw == 'driver') {
      _activeFilter = 'identity';
    } else {
      _activeFilter = 'all';
    }
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
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

    // Relative path (e.g. /uploads/uuid.jpg, uploads/uuid.jpg)
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

      if (docType == 'PROFILE_PHOTO') {
        await DriverService.instance.uploadProfilePhoto(
          fileBytes: bytes,
          fileName: filename,
          mimeType: mimeType,
        );
      } else {
        await DriverService.instance.uploadKycDocument(
          documentType: docType,
          fileBytes: bytes,
          filename: filename,
          mimeType: mimeType,
        );
      }

      if (mounted) {
        AppToast.showSuccess('$docTitle uploaded successfully!', context: context);
        await _fetchProfile();
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

  void _showDocumentPreview({
    required String title,
    required String docType,
    String? frontUrl,
    String? backUrl,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    bool showBack = false;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final currentUrl = (showBack && backUrl != null && backUrl.isNotEmpty) ? backUrl : frontUrl;
          final resolvedUrl = resolveDocumentUrl(currentUrl);
          final currentDocType = (showBack && docType == 'RC_FRONT')
              ? 'RC_BACK'
              : ((showBack && docType == 'AADHAR_FRONT') ? 'AADHAR_BACK' : docType);
          final hasBothSides = (frontUrl != null && frontUrl.isNotEmpty) && (backUrl != null && backUrl.isNotEmpty);

          return Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
            ),
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                        borderRadius: AppRadius.borderPill,
                      ),
                    ),
                  ),
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
                  if (hasBothSides || (backUrl != null && backUrl.isNotEmpty)) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ChoiceChip(
                          label: const Text('Front Side'),
                          selected: !showBack,
                          selectedColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.2),
                          onSelected: (selected) {
                            if (selected) setDialogState(() => showBack = false);
                          },
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          label: const Text('Back Side'),
                          selected: showBack,
                          selectedColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.2),
                          onSelected: (selected) {
                            if (selected) setDialogState(() => showBack = true);
                          },
                        ),
                      ],
                    ),
                  ],
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
                        docType: currentDocType,
                        isDark: isDark,
                        onReuploadSuccess: () {
                          Navigator.of(ctx).pop();
                          _showUploadSourcePicker(currentDocType, title);
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
                            _showUploadSourcePicker(currentDocType, title);
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
          );
        },
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
            Icon(Icons.upload_file_outlined, size: 48, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
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
            const SizedBox(height: 14),
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
      errorBuilder: (_, error, __) => _buildErrorFallback(title, isDark, onReuploadSuccess),
    );
  }

  Widget _buildErrorFallback(String title, bool isDark, VoidCallback onReupload) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.broken_image_outlined, size: 44, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          const SizedBox(height: 8),
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
          const SizedBox(height: 12),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
            ),
            onPressed: onReupload,
            icon: const Icon(Icons.refresh_rounded, size: 16),
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
    final status = (_profile['verificationStatus'] ?? user?.verificationStatus ?? 'PENDING').toString().toUpperCase();
    final isVerified = status == 'VERIFIED' || status == 'APPROVED';
    final isUnderReview = status == 'UNDER_REVIEW';
    final isRejected = status == 'REJECTED';

    final Color statusColor = isVerified
        ? AppColors.accentGreenDark
        : (isUnderReview ? AppColors.warning : (isRejected ? AppColors.error : AppColors.primary));
    final Color statusTextColor = isVerified
        ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
        : (isUnderReview
            ? (isDark ? Colors.amberAccent : AppColors.warning)
            : (isRejected ? (isDark ? Colors.redAccent : AppColors.error) : (isDark ? AppColors.primaryLight : AppColors.primary)));

    final String statusTitle = isVerified
        ? 'Verified'
        : (isUnderReview ? 'Under Review' : (isRejected ? 'Rejected' : 'Pending'));
    final String statusSubtitle = _activeFilter == 'vehicle'
        ? (isVerified
            ? 'All vehicle registration, insurance, and photo documents are verified.'
            : 'Vehicle documents required for commercial trips and compliance.')
        : (_activeFilter == 'identity'
            ? (isVerified
                ? 'Your driving license, Aadhaar, PAN, and selfie are verified.'
                : 'Identity documents required for driver profile verification.')
            : (isVerified
                ? 'Your KYC documents are verified and approved.'
                : (isUnderReview
                    ? 'Your documents are being reviewed by the AdhocX team.'
                    : (isRejected
                        ? (_profile['rejectionReason']?.toString() ?? 'Please re-upload your valid documents.')
                        : 'Complete and submit your KYC documents.'))));

    // Check individual document uploads from live profile, session user, or nested kycDocuments
    final driverProf = user?.driverProfile ?? {};
    final kycDocs = (_profile['kycDocuments'] is Map ? _profile['kycDocuments'] as Map : null) ??
                    (driverProf['kycDocuments'] is Map ? driverProf['kycDocuments'] as Map : null) ?? {};

    final dlFront = _profile['dlFrontUrl'] ?? driverProf['dlFrontUrl'] ?? kycDocs['dlFrontUrl'];
    final dlBack = _profile['dlBackUrl'] ?? driverProf['dlBackUrl'] ?? kycDocs['dlBackUrl'];
    final rcFront = _profile['rcFrontUrl'] ?? _profile['rcDocUrl'] ?? driverProf['rcFrontUrl'] ?? driverProf['rcDocUrl'] ?? kycDocs['rcFrontUrl'] ?? kycDocs['rcDocUrl'];
    final rcBack = _profile['rcBackUrl'] ?? driverProf['rcBackUrl'] ?? kycDocs['rcBackUrl'];
    final insUrl = _profile['insuranceDocUrl'] ?? driverProf['insuranceDocUrl'] ?? kycDocs['insuranceDocUrl'];
    final vehUrl = _profile['vehiclePhotoUrl'] ?? driverProf['vehiclePhotoUrl'] ?? kycDocs['vehiclePhotoUrl'];
    final aadharFront = _profile['aadharFrontUrl'] ?? driverProf['aadharFrontUrl'] ?? kycDocs['aadharFrontUrl'];
    final aadharBack = _profile['aadharBackUrl'] ?? driverProf['aadharBackUrl'] ?? kycDocs['aadharBackUrl'];
    final panUrl = _profile['panDocUrl'] ?? driverProf['panDocUrl'] ?? kycDocs['panDocUrl'];
    final photoUrl = _profile['profilePhotoUrl'] ?? driverProf['profilePhotoUrl'] ?? kycDocs['profilePhotoUrl'] ?? user?.effectivePhotoUrl ?? user?.photoUrl;

    final hasDl = (dlFront != null && dlFront.toString().trim().isNotEmpty) || (dlBack != null && dlBack.toString().trim().isNotEmpty);
    final hasRc = (rcFront != null && rcFront.toString().trim().isNotEmpty) || (rcBack != null && rcBack.toString().trim().isNotEmpty);
    final hasIns = insUrl != null && insUrl.toString().trim().isNotEmpty;
    final hasVeh = vehUrl != null && vehUrl.toString().trim().isNotEmpty;
    final hasAadhar = (aadharFront != null && aadharFront.toString().trim().isNotEmpty) || (aadharBack != null && aadharBack.toString().trim().isNotEmpty);
    final hasPan = panUrl != null && panUrl.toString().trim().isNotEmpty;
    final hasPhoto = photoUrl != null && photoUrl.toString().trim().isNotEmpty;

    final List<_KycDocItem> allItems = [
      _KycDocItem(
        icon: Icons.account_circle_outlined,
        title: 'Profile Photo / Selfie',
        docType: 'PROFILE_PHOTO',
        category: 'identity',
        isUploaded: hasPhoto,
        frontUrl: photoUrl?.toString(),
      ),
      _KycDocItem(
        icon: Icons.drive_eta_outlined,
        title: 'Driving License',
        docType: 'DRIVING_LICENSE',
        category: 'identity',
        isUploaded: hasDl,
        frontUrl: dlFront?.toString(),
        backUrl: dlBack?.toString(),
      ),
      _KycDocItem(
        icon: Icons.credit_card_outlined,
        title: 'Aadhaar Card',
        docType: 'AADHAR_FRONT',
        category: 'identity',
        isUploaded: hasAadhar,
        frontUrl: aadharFront?.toString(),
        backUrl: aadharBack?.toString(),
      ),
      _KycDocItem(
        icon: Icons.badge_outlined,
        title: 'PAN Card',
        docType: 'PAN_CARD',
        category: 'identity',
        isUploaded: hasPan,
        frontUrl: panUrl?.toString(),
      ),
      _KycDocItem(
        icon: Icons.description_outlined,
        title: 'Vehicle Registration (RC)',
        docType: 'RC_FRONT',
        category: 'vehicle',
        isUploaded: hasRc,
        frontUrl: rcFront?.toString(),
        backUrl: rcBack?.toString(),
      ),
      _KycDocItem(
        icon: Icons.security_outlined,
        title: 'Commercial Insurance',
        docType: 'INSURANCE',
        category: 'vehicle',
        isUploaded: hasIns,
        frontUrl: insUrl?.toString(),
      ),
      _KycDocItem(
        icon: Icons.directions_car_outlined,
        title: 'Vehicle Photo',
        docType: 'VEHICLE_PHOTO',
        category: 'vehicle',
        isUploaded: hasVeh,
        frontUrl: vehUrl?.toString(),
      ),
    ];

    final displayedItems = _activeFilter == 'all'
        ? allItems
        : allItems.where((d) => d.category == _activeFilter).toList();

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
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _activeFilter == 'vehicle'
                            ? 'Vehicle Documents'
                            : (_activeFilter == 'identity' ? 'Identity Documents' : 'KYC & Verification'),
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (_isUploading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: _fetchProfile,
                          child: ListView(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            children: [
                              // ── Category Filter Pills ──────────────────────────────
                              _buildFilterSelector(
                                isDark: isDark,
                                identityCount: allItems.where((d) => d.category == 'identity').length,
                                vehicleCount: allItems.where((d) => d.category == 'vehicle').length,
                              ),
                              const SizedBox(height: AppSpacing.lg),

                              // ── Status Banner Card ─────────────────────────────────
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xl),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: isDark ? 0.15 : 0.08),
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: statusColor.withValues(alpha: 0.25),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _activeFilter == 'vehicle'
                                                ? 'Vehicle Document Status'
                                                : (_activeFilter == 'identity' ? 'Driver Identity Status' : 'KYC Status'),
                                            style: AppTypography.caption(
                                              color: statusTextColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            statusTitle,
                                            style: AppTypography.h1(
                                              color: statusTextColor,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            statusSubtitle,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: statusColor.withValues(alpha: isDark ? 0.2 : 0.15),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: statusTextColor,
                                          width: 2,
                                        ),
                                      ),
                                      child: Icon(
                                        isVerified
                                            ? Icons.check_rounded
                                            : (isUnderReview
                                                ? Icons.schedule_rounded
                                                : (isRejected ? Icons.close_rounded : Icons.info_outline)),
                                        color: statusTextColor,
                                        size: 28,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xl),

                              // ── Submitted Documents Section Header ────────────────
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _activeFilter == 'vehicle'
                                        ? 'Vehicle Documents (${displayedItems.length})'
                                        : (_activeFilter == 'identity'
                                            ? 'Identity Documents (${displayedItems.length})'
                                            : 'Submitted Documents (${displayedItems.length})'),
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (_activeFilter != 'all')
                                    GestureDetector(
                                      onTap: () => setState(() => _activeFilter = 'all'),
                                      child: Text(
                                        'View All',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // ── Documents Card List ────────────────────────────────
                              Container(
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    for (int i = 0; i < displayedItems.length; i++) ...[
                                      if (i > 0)
                                        Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                      _buildDocumentTile(
                                        context: context,
                                        icon: displayedItems[i].icon,
                                        title: displayedItems[i].title,
                                        docType: displayedItems[i].docType,
                                        isDark: isDark,
                                        isUploaded: displayedItems[i].isUploaded,
                                        overallStatus: status,
                                        frontUrl: displayedItems[i].frontUrl,
                                        backUrl: displayedItems[i].backUrl,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.lg),

                              // ── Info Bottom Footer ─────────────────────────────────
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: AppSpacing.lg,
                                  vertical: AppSpacing.md,
                                ),
                                decoration: BoxDecoration(
                                  color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: isDark ? 0.15 : 0.12),
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.info_outline_rounded,
                                      size: 18,
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _activeFilter == 'vehicle'
                                            ? (isVerified
                                                ? 'Your vehicle documents meet all commercial transport compliance standards.'
                                                : 'Upload clear photos of both sides of your RC book and insurance policy.')
                                            : (_activeFilter == 'identity'
                                                ? (isVerified
                                                    ? 'Your driver identity documents are approved and active.'
                                                    : 'Ensure all personal identity details match your official government IDs.')
                                                : (isVerified
                                                    ? 'All documents are verified and compliant with AdhocX standards.'
                                                    : 'Keep your documents updated for fast trip dispatch and verification.')),
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
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

  Widget _buildFilterSelector({
    required bool isDark,
    required int identityCount,
    required int vehicleCount,
  }) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          _buildFilterChip(
            id: 'all',
            label: 'All Documents',
            count: identityCount + vehicleCount,
            icon: Icons.folder_copy_outlined,
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildFilterChip(
            id: 'identity',
            label: 'Identity & Driver',
            count: identityCount,
            icon: Icons.person_outline_rounded,
            isDark: isDark,
          ),
          const SizedBox(width: 8),
          _buildFilterChip(
            id: 'vehicle',
            label: 'Vehicle Documents',
            count: vehicleCount,
            icon: Icons.directions_car_outlined,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String id,
    required String label,
    required int count,
    required IconData icon,
    required bool isDark,
  }) {
    final isSelected = _activeFilter == id;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (_activeFilter != id) {
            setState(() => _activeFilter = id);
          }
        },
        borderRadius: BorderRadius.circular(AppRadius.full),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? AppColors.primaryLight : AppColors.primary)
                : (isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight),
            borderRadius: BorderRadius.circular(AppRadius.full),
            border: Border.all(
              color: isSelected
                  ? (isDark ? AppColors.primaryLight : AppColors.primary)
                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
              width: isSelected ? 1.5 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected
                    ? (isDark ? AppColors.bgDark : Colors.white)
                    : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: AppTypography.bodyMedium(
                  color: isSelected
                      ? (isDark ? AppColors.bgDark : Colors.white)
                      : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? Colors.black.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.25))
                      : (isDark ? AppColors.borderDark : AppColors.borderLight),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text(
                  '$count',
                  style: AppTypography.caption(
                    color: isSelected
                        ? (isDark ? AppColors.bgDark : Colors.white)
                        : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentTile({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String docType,
    required bool isDark,
    required bool isUploaded,
    required String overallStatus,
    String? frontUrl,
    String? backUrl,
  }) {
    final bool isVerified = isUploaded && (overallStatus == 'VERIFIED' || overallStatus == 'APPROVED');
    final bool isUnderReview = isUploaded && overallStatus == 'UNDER_REVIEW';
    final bool isRejected = isUploaded && overallStatus == 'REJECTED';

    final String label = !isUploaded
        ? 'Not Uploaded'
        : (isVerified ? 'Verified' : (isUnderReview ? 'Under Review' : (isRejected ? 'Rejected' : 'Uploaded')));

    final Color badgeColor = !isUploaded
        ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
        : (isVerified
            ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
            : (isUnderReview ? Colors.amber : (isRejected ? Colors.redAccent : AppColors.primary)));

    final IconData badgeIcon = !isUploaded
        ? Icons.radio_button_unchecked
        : (isVerified
            ? Icons.check_circle_rounded
            : (isUnderReview ? Icons.schedule_rounded : (isRejected ? Icons.cancel_rounded : Icons.check_circle_outline)));

    void openPreview() {
      _showDocumentPreview(
        title: title,
        docType: docType,
        frontUrl: frontUrl,
        backUrl: backUrl,
      );
    }

    return ListTile(
      onTap: openPreview,
      leading: Icon(
        icon,
        size: 20,
        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
      ),
      title: Text(
        title,
        style: AppTypography.body(
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: AppTypography.caption(
              color: badgeColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 6),
          Icon(
            badgeIcon,
            size: 18,
            color: badgeColor,
          ),
          const SizedBox(width: 8),
          // ── "i" Info Button for viewing the document directly ──
          IconButton(
            icon: Icon(
              Icons.info_outline_rounded,
              size: 20,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
            ),
            padding: const EdgeInsets.all(4),
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            splashRadius: 18,
            tooltip: 'View Document',
            onPressed: openPreview,
          ),
        ],
      ),
    );
  }
}

class _KycDocItem {
  final IconData icon;
  final String title;
  final String docType;
  final String category; // 'identity' or 'vehicle'
  final bool isUploaded;
  final String? frontUrl;
  final String? backUrl;

  const _KycDocItem({
    required this.icon,
    required this.title,
    required this.docType,
    required this.category,
    required this.isUploaded,
    this.frontUrl,
    this.backUrl,
  });
}
