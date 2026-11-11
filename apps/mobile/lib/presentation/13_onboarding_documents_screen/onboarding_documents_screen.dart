import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_document_upload_tile.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_stepper_header.dart';
import '../../widgets/aadhaar_consent_sheet.dart';

/// Screen 13: Step 2 of 3: Verify Driver Identity (Profile Photo, Aadhaar Front & Back, PAN Card).
class OnboardingDocumentsScreen extends StatefulWidget {
  const OnboardingDocumentsScreen({super.key});

  @override
  State<OnboardingDocumentsScreen> createState() =>
      _OnboardingDocumentsScreenState();
}

class _OnboardingDocumentsScreenState extends State<OnboardingDocumentsScreen>
    with WidgetsBindingObserver {
  final Map<String, bool> _uploadingState = {};
  final ImagePicker _picker = ImagePicker();
  String? _inlineErrorMessage;
  bool _digilockerSyncing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadExistingDocuments();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      final activeKid = DigioService.instance.activeDigilockerRequestId.value;
      final dlkrVerified = DigioService.verifiedDocsFromMap(
              DigioService.instance.latestByTypeNotifier.value)['digilocker'] ==
          true;
      if (activeKid != null && activeKid.isNotEmpty && !dlkrVerified) {
        _syncDigilocker(activeKid, silentIfPending: true);
      }
    }
  }

  Future<void> _loadExistingDocuments() async {
    try {
      final onboarding = context.read<OnboardingProvider>();
      onboarding.syncFromDigioLatest(
        DigioService.instance.latestByTypeNotifier.value,
        notify: false,
      );

      final results = await Future.wait([
        DriverService.instance.getProfile(),
        DigioService.instance
            .getMyVerifications(force: true)
            .catchError((_) => <String, dynamic>{}),
      ]);
      if (!mounted) return;

      final profile = results[0];
      onboarding.syncFromDigioLatest(
        DigioService.instance.latestByTypeNotifier.value,
      );
      if (profile is! Map) {
        setState(() {});
        return;
      }

      final vehiclePhoto = profile['vehiclePhotoUrl']?.toString();
      final profilePhoto = profile['profilePhotoUrl']?.toString();
      final isValidProfilePhoto = profilePhoto != null &&
          profilePhoto.trim().isNotEmpty &&
          profilePhoto != 'null' &&
          profilePhoto != 'undefined' &&
          profilePhoto != vehiclePhoto;

      if (isValidProfilePhoto &&
          (onboarding.profilePhotoUrl == null || onboarding.profilePhotoUrl!.isEmpty)) {
        onboarding.setDocumentUrl('PROFILE_PHOTO', profilePhoto);
      }
      if (profile['dlFrontUrl'] != null && onboarding.drivingLicenseUrl == null) {
        onboarding.setDocumentUrl('DRIVING_LICENSE', profile['dlFrontUrl'].toString());
      }
      if (profile['aadharFrontUrl'] != null && onboarding.aadharFrontUrl == null) {
        onboarding.setDocumentUrl('AADHAR_FRONT', profile['aadharFrontUrl'].toString());
      }
      if (profile['aadharBackUrl'] != null && onboarding.aadharBackUrl == null) {
        onboarding.setDocumentUrl('AADHAR_BACK', profile['aadharBackUrl'].toString());
      }
      if (profile['panDocUrl'] != null && onboarding.panCardUrl == null) {
        onboarding.setDocumentUrl('PAN_CARD', profile['panDocUrl'].toString());
      }
      if (profile['rcFrontUrl'] != null && onboarding.rcFrontUrl == null) {
        onboarding.setDocumentUrl('RC_FRONT', profile['rcFrontUrl'].toString());
      }
      if (profile['rcBackUrl'] != null && onboarding.rcBackUrl == null) {
        onboarding.setDocumentUrl('RC_BACK', profile['rcBackUrl'].toString());
      }
      if (profile['rcDocUrl'] != null && onboarding.rcFrontUrl == null) {
        onboarding.setDocumentUrl('RC_FRONT', profile['rcDocUrl'].toString());
      }
      if (profile['insuranceDocUrl'] != null && onboarding.insuranceUrl == null) {
        onboarding.setDocumentUrl('INSURANCE', profile['insuranceDocUrl'].toString());
      }

      final rawDocs = profile['documents'] ?? profile['kycDocuments'];
      if (rawDocs is List) {
        for (final doc in rawDocs) {
          if (doc is Map && doc['documentType'] != null && doc['fileUrl'] != null) {
            final docType = doc['documentType'].toString();
            final fileUrl = doc['fileUrl'].toString();
            if (docType == 'PROFILE_PHOTO' && fileUrl == vehiclePhoto) {
              continue;
            }
            onboarding.setDocumentUrl(docType, fileUrl);
          }
        }
      } else if (rawDocs is Map) {
        for (final entry in rawDocs.values) {
          if (entry is Map && entry['documentType'] != null && entry['fileUrl'] != null) {
            final docType = entry['documentType'].toString();
            final fileUrl = entry['fileUrl'].toString();
            if (docType == 'PROFILE_PHOTO' && fileUrl == vehiclePhoto) {
              continue;
            }
            onboarding.setDocumentUrl(docType, fileUrl);
          }
        }
        if (rawDocs['profilePhotoUrl'] != null &&
            (onboarding.profilePhotoUrl == null || onboarding.profilePhotoUrl!.isEmpty)) {
          final rawPhoto = rawDocs['profilePhotoUrl'].toString();
          if (rawPhoto.trim().isNotEmpty &&
              rawPhoto != 'null' &&
              rawPhoto != 'undefined' &&
              rawPhoto != vehiclePhoto) {
            onboarding.setDocumentUrl('PROFILE_PHOTO', rawPhoto);
          }
        }
      }

      setState(() {});
    } catch (_) {}
  }

  Future<void> _showImageSourcePicker(String docType, String docTitle) async {
    // Aadhaar images may only be collected after the driver's consent is recorded.
    if (docType == 'AADHAR_FRONT' || docType == 'AADHAR_BACK') {
      try {
        final ok = await withAadhaarConsent<bool>(context, () async => true);
        if (ok != true) return;
      } catch (e) {
        if (mounted) AppToast.showError(AppToast.cleanErrorMessage(e), context: context);
        return;
      }
      if (!mounted) return;
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
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
                  'Capture document directly using camera',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUpload(docType, docTitle, ImageSource.camera);
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
                  'Select existing photo or scanned document',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUpload(docType, docTitle, ImageSource.gallery);
                },
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUpload(
    String docType,
    String docTitle,
    ImageSource source,
  ) async {
    final driverService = context.read<DriverService>();
    final onboarding = context.read<OnboardingProvider>();

    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (pickedFile == null) return;

      setState(() {
        _uploadingState[docType] = true;
        _inlineErrorMessage = null;
      });

      final bytes = await pickedFile.readAsBytes();
      final ext = pickedFile.name.split('.').last.toLowerCase();
      final mimeType = (ext == 'png') ? 'image/png' : 'image/jpeg';
      final filename = '${docType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}.$ext';

      final res = await driverService.uploadKycDocument(
        documentType: docType,
        fileBytes: bytes,
        filename: filename,
        mimeType: mimeType,
      );

      final uploadedUrl = res['url'];
      if (uploadedUrl == null || uploadedUrl.toString().isEmpty) {
        throw Exception('Upload succeeded but no URL returned from server');
      }

      onboarding.setDocumentUrl(docType, uploadedUrl);

      // Background Digio AI check (non-blocking) for Selfie Liveness & Aadhaar OCR + Masking
      if (docType == 'PROFILE_PHOTO') {
        DigioService.instance
            .checkUploadedLiveness(fileBytes: bytes, fileName: filename)
            .then((res) {
          if (mounted && res['verified'] != true) {
            AppToast.showInfo(
              'Selfie uploaded. Tip: ensure good lighting and your full face is visible for liveness check.',
              context: context,
            );
          }
        }).catchError((_) {});
      } else if (docType == 'AADHAR_FRONT' || docType == 'AADHAR_BACK') {
        DigioService.instance
            .analyzeStoredIdCard(
              frontDocUrl: uploadedUrl.toString(),
              expectedIds: const ['AADHAAR'],
              saveMaskedToDriver: true,
              aadhaarSide: docType == 'AADHAR_BACK' ? 'BACK' : 'FRONT',
            )
            .then((res) {
          final summary = res['summary'];
          if (summary is Map && summary['maskedStoredUrl'] != null) {
            onboarding.setDocumentUrl(
              docType,
              summary['maskedStoredUrl'].toString(),
            );
          }
        }).catchError((_) {});
      } else if (docType == 'PAN_CARD') {
        DigioService.instance
            .analyzeStoredIdCard(
              frontDocUrl: uploadedUrl.toString(),
              expectedIds: const ['PAN'],
              saveMaskedToDriver: false,
            )
            .then((res) {
          final summary = res['summary'];
          if (summary is Map && summary['idNumber'] != null) {
            onboarding.setKycIdentifiers(
              panNumber: summary['idNumber'].toString(),
            );
          }
        }).catchError((_) {});
      } else if (docType == 'DRIVING_LICENSE') {
        DigioService.instance
            .analyzeStoredIdCard(
              frontDocUrl: uploadedUrl.toString(),
              expectedIds: const ['DRIVING_LICENCE'],
              saveMaskedToDriver: false,
            )
            .then((res) {
          final summary = res['summary'];
          if (summary is Map && summary['idNumber'] != null) {
            onboarding.setKycIdentifiers(
              dlNumber: summary['idNumber'].toString(),
            );
          }
        }).catchError((_) {});
      }

      if (mounted) {
        AppToast.showSuccess('$docTitle uploaded successfully', context: context);
      }
    } catch (e) {
      if (mounted) {
        final cleanMsg = AppToast.cleanErrorMessage(e);
        setState(() => _inlineErrorMessage = 'Failed to upload $docTitle: $cleanMsg');
        AppToast.showError('Failed to upload $docTitle: $cleanMsg', context: context);
      }
    } finally {
      if (mounted) setState(() => _uploadingState[docType] = false);
    }
  }

  Future<void> _launchDigilockerFlow(BuildContext context, OnboardingProvider onboarding) async {
    try {
      final session = await withAadhaarConsent(
        context,
        () => DigioService.instance.createDigilockerSession(
          customerIdentifier: onboarding.phone.isNotEmpty ? onboarding.phone : null,
          customerName: onboarding.fullName.isNotEmpty ? onboarding.fullName : null,
        ),
      );
      if (session == null) return; // consent declined
      final gatewayUrl = session['gatewayUrl']?.toString();
      if (gatewayUrl != null && gatewayUrl.isNotEmpty) {
        final launched = await DigioService.instance.launchGatewayUrl(gatewayUrl);
        if (context.mounted) {
          if (launched) {
            AppToast.showInfo(
              'DigiLocker opened. Complete authorization, then tap "Sync DigiLocker".',
              context: context,
            );
          } else {
            AppToast.showError(
              'Unable to open DigiLocker in your browser. Please allow browser links and try again.',
              context: context,
            );
          }
        }
      } else if (context.mounted) {
        AppToast.showError(
          'DigiLocker session did not return a launch link. Please try again.',
          context: context,
        );
      }
    } catch (e) {
      if (context.mounted) {
        AppToast.showError(AppToast.cleanErrorMessage(e), context: context);
      }
    }
  }

  Future<void> _syncDigilocker(
    String activeKid, {
    bool silentIfPending = false,
  }) async {
    if (_digilockerSyncing) return;
    _digilockerSyncing = true;
    final onboarding = context.read<OnboardingProvider>();
    try {
      final res = await DigioService.instance.syncDigilockerStatus(activeKid);
      if (res['verified'] == true) {
        Map<String, dynamic>? docUrls;
        try {
          final mediaRes =
              await DigioService.instance.syncDigilockerMedia(activeKid);
          if (mediaRes['documentUrls'] is Map) {
            docUrls = Map<String, dynamic>.from(mediaRes['documentUrls']);
          }
          final files = mediaRes['attachedFiles'];
          if (files is List) {
            for (final f in files) {
              if (f is Map) {
                final dt = f['docType']?.toString().toUpperCase() ?? '';
                final u = f['url']?.toString();
                if (u != null && u.isNotEmpty) {
                  if (dt.contains('AADHAAR')) {
                    if (onboarding.aadharFrontUrl == null) {
                      onboarding.setDocumentUrl('AADHAR_FRONT', u);
                    }
                    if (onboarding.aadharBackUrl == null) {
                      onboarding.setDocumentUrl('AADHAR_BACK', u);
                    }
                  } else if (dt.contains('DRIVING') &&
                      onboarding.drivingLicenseUrl == null) {
                    onboarding.setDocumentUrl('DRIVING_LICENSE', u);
                  } else if (dt.contains('PAN') &&
                      onboarding.panCardUrl == null) {
                    onboarding.setDocumentUrl('PAN_CARD', u);
                  } else if (dt.contains('RC')) {
                    if (onboarding.rcFrontUrl == null) {
                      onboarding.setDocumentUrl('RC_FRONT', u);
                    }
                    if (onboarding.rcBackUrl == null) {
                      onboarding.setDocumentUrl('RC_BACK', u);
                    }
                  }
                }
              }
            }
          }
        } catch (_) {}

        onboarding.syncFromDigioLatest(
          DigioService.instance.latestByTypeNotifier.value,
          syncedMediaUrls: docUrls,
        );
      }
      if (mounted && (res['verified'] == true || !silentIfPending)) {
        AppToast.showInfo(
          res['verified'] == true
              ? 'DigiLocker documents synced & auto-marked below!'
              : 'DigiLocker status: ${res['status']}',
          context: context,
        );
      }
    } catch (e) {
      if (mounted && !silentIfPending) {
        AppToast.showError(AppToast.cleanErrorMessage(e), context: context);
      }
    } finally {
      _digilockerSyncing = false;
    }
  }

  Widget _buildDigioAssistantBanner(
    BuildContext context,
    OnboardingProvider onboarding,
    bool isDark,
  ) {
    return ValueListenableBuilder<Map<String, dynamic>>(
      valueListenable: DigioService.instance.latestByTypeNotifier,
      builder: (context, latest, _) {
        final vDocs = DigioService.verifiedDocsFromMap(latest);
        final dlkrOk = vDocs['digilocker'] == true;
        final livenessOk = latest['LIVENESS']?['verified'] == true;
        final ocrOk = latest['ID_OCR']?['verified'] == true;

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.primary.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.primary.withValues(alpha: 0.2),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.verified_user_rounded, size: 18, color: isDark ? AppColors.primaryLight : AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'DigiLocker Verification',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ValueListenableBuilder<String?>(
                valueListenable: DigioService.instance.activeDigilockerRequestId,
                builder: (context, activeKid, _) {
                  final greenColor = isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: dlkrOk ? greenColor : AppColors.primary,
                            disabledBackgroundColor: greenColor.withValues(alpha: 0.16),
                            disabledForegroundColor: greenColor,
                            foregroundColor: Colors.white,
                            elevation: dlkrOk ? 0 : 1,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              side: dlkrOk
                                  ? BorderSide(color: greenColor.withValues(alpha: 0.45))
                                  : BorderSide.none,
                            ),
                          ),
                          icon: Icon(
                            dlkrOk ? Icons.check_circle_rounded : Icons.verified_user_outlined,
                            size: 20,
                          ),
                          label: Text(
                            dlkrOk ? 'DigiLocker Verified' : 'Verify with DigiLocker',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                          onPressed: dlkrOk ? null : () => _launchDigilockerFlow(context, onboarding),
                        ),
                      ),
                      if (activeKid != null) ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.sync_rounded, size: 16),
                            label: const Text('Sync DigiLocker'),
                            onPressed: () => _syncDigilocker(activeKid),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
              if (livenessOk || ocrOk) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  children: [
                    if (livenessOk)
                      Text(
                        '✓ Selfie Liveness Verified',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accentGreenDark),
                      ),
                    if (ocrOk)
                      Text(
                        '✓ Auto OCR & Aadhaar Masking Active',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.accentGreenDark),
                      ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  void _handleContinue() {
    final onboarding = context.read<OnboardingProvider>();
    final vDocs = DigioService.verifiedDocsFromMap(
      DigioService.instance.latestByTypeNotifier.value,
    );

    final dlOk = onboarding.isDlSatisfied || vDocs['dl'] == true;
    if (!dlOk) {
      const msg = 'Please upload your Driving License or verify via DigiLocker before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final adhFrontOk = onboarding.isAadhaarFrontSatisfied || vDocs['aadhaar'] == true;
    if (!adhFrontOk) {
      const msg = 'Please upload Aadhaar Card (Front) or connect DigiLocker before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final adhBackOk = onboarding.isAadhaarBackSatisfied || vDocs['aadhaar'] == true;
    if (!adhBackOk) {
      const msg = 'Please upload Aadhaar Card (Back) or connect DigiLocker before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final panOk = onboarding.isPanSatisfied || vDocs['pan'] == true;
    if (!panOk) {
      const msg = 'Please upload PAN Card (Front) or verify via DigiLocker before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    setState(() => _inlineErrorMessage = null);
    // In-app Face Verification captures live selfie before Vehicle Details
    context.push(AppRoutes.onboardingFaceVerificationScreen);
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ValueListenableBuilder<Map<String, dynamic>>(
      valueListenable: DigioService.instance.latestByTypeNotifier,
      builder: (context, latest, _) {
        final vDocs = DigioService.verifiedDocsFromMap(latest);

        final bool dlDigitallyVerified =
            vDocs['dl'] == true || onboarding.isDlVerifiedDigitally;
        final bool aadhaarDigitallyVerified =
            vDocs['aadhaar'] == true || onboarding.isAadhaarVerifiedDigitally;
        final bool panDigitallyVerified =
            vDocs['pan'] == true || onboarding.isPanVerifiedDigitally;

        final int uploadedCount =
            ((onboarding.drivingLicenseUrl != null || dlDigitallyVerified) ? 1 : 0) +
            ((onboarding.aadharFrontUrl != null || aadhaarDigitallyVerified) ? 1 : 0) +
            ((onboarding.aadharBackUrl != null || aadhaarDigitallyVerified) ? 1 : 0) +
            ((onboarding.panCardUrl != null || panDigitallyVerified) ? 1 : 0);

        return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xxl,
                      vertical: AppSpacing.lg,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ── 3-Step Progress Header ───────────────────────────
                        AppStepperHeader(
                          currentStep: 2,
                          totalSteps: 3,
                          onBack: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go(AppRoutes.waitlistGateScreen);
                            }
                          },
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Title & Subtitle ─────────────────────────────────
                        Text(
                          'Verify Identity',
                          style: AppTypography.h1(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Step 2 of 3: Verify or upload your government documents ($uploadedCount/4 ready)',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Instant KYC & DigiLocker ─────────────────────────
                        _buildDigioAssistantBanner(context, onboarding, isDark),
                        const SizedBox(height: AppSpacing.md),

                        // ── Inline Red Alert Banner ──────────────────────────
                        if (_inlineErrorMessage != null) ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.error.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _inlineErrorMessage!,
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.errorContainer : AppColors.error,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // ── Document 1: Driving License ──────────────────────
                        AppDocumentUploadTile(
                          title: 'Driving License *',
                          subtitle: 'Front side of commercial / transport driving license',
                          icon: Icons.badge_outlined,
                          isUploaded: onboarding.drivingLicenseUrl != null,
                          isVerifiedDigitally: dlDigitallyVerified,
                          verifiedBadgeLabel: 'DigiLocker',
                          verifiedSubtitle: 'Verified via DigiLocker — already uploaded',
                          isUploading: _uploadingState['DRIVING_LICENSE'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('DRIVING_LICENSE', 'Driving License'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 3: Aadhar Card Front ───────────────────
                        AppDocumentUploadTile(
                          title: 'Aadhaar Card (Front) *',
                          subtitle: 'Front side with photo and Aadhaar number',
                          icon: Icons.credit_card_rounded,
                          isUploaded: onboarding.aadharFrontUrl != null,
                          isVerifiedDigitally: aadhaarDigitallyVerified,
                          verifiedBadgeLabel: 'DigiLocker',
                          verifiedSubtitle: 'Verified via DigiLocker — already uploaded',
                          isUploading: _uploadingState['AADHAR_FRONT'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('AADHAR_FRONT', 'Aadhaar Card (Front)'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 4: Aadhar Card Back ────────────────────
                        AppDocumentUploadTile(
                          title: 'Aadhaar Card (Back) *',
                          subtitle: 'Back side showing residential address',
                          icon: Icons.credit_card_outlined,
                          isUploaded: onboarding.aadharBackUrl != null,
                          isVerifiedDigitally: aadhaarDigitallyVerified,
                          verifiedBadgeLabel: 'DigiLocker',
                          verifiedSubtitle: 'Verified via DigiLocker — already uploaded',
                          isUploading: _uploadingState['AADHAR_BACK'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('AADHAR_BACK', 'Aadhaar Card (Back)'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 5: PAN Card Front ──────────────────────
                        AppDocumentUploadTile(
                          title: 'PAN Card (Front) *',
                          subtitle: 'Front side with PAN number and signature',
                          icon: Icons.assignment_ind_outlined,
                          isUploaded: onboarding.panCardUrl != null,
                          isVerifiedDigitally: panDigitallyVerified,
                          verifiedBadgeLabel: 'DigiLocker',
                          verifiedSubtitle: 'Verified via DigiLocker — already uploaded',
                          isUploading: _uploadingState['PAN_CARD'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('PAN_CARD', 'PAN Card (Front)'),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                      ],
                    ),
                  ),
                ),

                // ── Primary Action ─────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xxl,
                    vertical: AppSpacing.md,
                  ),
                  child: AppPrimaryButton(
                    text: 'CONTINUE TO FACE VERIFICATION',
                    onPressed: _handleContinue,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
        );
      },
    );
  }
}
