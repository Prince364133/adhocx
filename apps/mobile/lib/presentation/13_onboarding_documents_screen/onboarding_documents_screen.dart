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

  Future<void> _showPanVerifySheet(
    BuildContext context,
    OnboardingProvider onboarding,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _PanVerifyBottomSheet(
        onboarding: onboarding,
        parentContext: context,
      ),
    );
  }

  Future<void> _showDlVerifySheet(
    BuildContext context,
    OnboardingProvider onboarding,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DlVerifyBottomSheet(
        onboarding: onboarding,
        parentContext: context,
      ),
    );
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
        final panOk = vDocs['pan'] == true || onboarding.isPanVerifiedDigitally;
        final dlOk = vDocs['dl'] == true || onboarding.isDlVerifiedDigitally;
        final dlkrOk = vDocs['digilocker'] == true;
        final faceOk = latest['FACE_MATCH']?['verified'] == true;
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
                      'DigiLocker & Instant KYC',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Connect DigiLocker or verify Govt IDs below — verified documents auto-mark green with no duplicate upload. Admin reviews all KYC before activation.',
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: 10),
              ValueListenableBuilder<String?>(
                valueListenable: DigioService.instance.activeDigilockerRequestId,
                builder: (context, activeKid, _) {
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        avatar: Icon(
                          dlkrOk ? Icons.check_circle : Icons.account_balance_wallet_outlined,
                          size: 16,
                          color: dlkrOk ? AppColors.accentGreenDark : AppColors.primary,
                        ),
                        label: Text(dlkrOk ? 'DigiLocker Verified' : 'Connect DigiLocker'),
                        onPressed: dlkrOk ? null : () => _launchDigilockerFlow(context, onboarding),
                      ),
                      if (activeKid != null)
                        ActionChip(
                          avatar: const Icon(Icons.sync_rounded, size: 16),
                          label: const Text('Sync DigiLocker'),
                          onPressed: () => _syncDigilocker(activeKid),
                        ),
                      ActionChip(
                        avatar: Icon(
                          panOk ? Icons.check_circle : Icons.badge_outlined,
                          size: 16,
                          color: panOk ? AppColors.accentGreenDark : null,
                        ),
                        label: Text(panOk ? 'PAN Verified' : 'Verify PAN'),
                        onPressed: panOk ? null : () => _showPanVerifySheet(context, onboarding),
                      ),
                      ActionChip(
                        avatar: Icon(
                          dlOk ? Icons.check_circle : Icons.credit_card_outlined,
                          size: 16,
                          color: dlOk ? AppColors.accentGreenDark : null,
                        ),
                        label: Text(dlOk ? 'DL Verified' : 'Verify DL'),
                        onPressed: dlOk ? null : () => _showDlVerifySheet(context, onboarding),
                      ),
                      if (onboarding.profilePhotoUrl != null &&
                          (onboarding.drivingLicenseUrl != null || onboarding.aadharFrontUrl != null))
                        ActionChip(
                          avatar: Icon(
                            faceOk ? Icons.face_retouching_natural : Icons.face_outlined,
                            size: 16,
                            color: faceOk ? AppColors.accentGreenDark : null,
                          ),
                          label: Text(
                            faceOk && latest['FACE_MATCH']?['matchScore'] != null
                                ? 'Face ${latest['FACE_MATCH']['matchScore']}%'
                                : 'Run Face Match',
                          ),
                          onPressed: () async {
                            try {
                              final res = await DigioService.instance.faceMatchStored(
                                image1Url: onboarding.profilePhotoUrl,
                                image2Url: onboarding.drivingLicenseUrl ?? onboarding.aadharFrontUrl,
                              );
                              if (context.mounted) {
                                if (res['verified'] == true) {
                                  AppToast.showSuccess(
                                    'Face Match passed (${res['matchScore']}%)',
                                    context: context,
                                  );
                                } else {
                                  AppToast.showError(
                                    res['complianceNotes']?.toString() ?? 'Face match failed',
                                    context: context,
                                  );
                                }
                              }
                            } catch (e) {
                              if (context.mounted) AppToast.showError(AppToast.cleanErrorMessage(e), context: context);
                            }
                          },
                        ),
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

    if (onboarding.profilePhotoUrl == null ||
        onboarding.profilePhotoUrl!.trim().isEmpty ||
        onboarding.profilePhotoUrl == 'null' ||
        onboarding.profilePhotoUrl == 'undefined') {
      const msg = 'Please upload your Driver Profile Photo before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final dlOk = onboarding.isDlSatisfied || vDocs['dl'] == true;
    if (!dlOk) {
      const msg = 'Please upload or verify your Driving License before proceeding';
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
      const msg = 'Please upload or verify PAN Card (Front) before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    setState(() => _inlineErrorMessage = null);
    // Step 3 of 3: Vehicle Verification (Add Vehicle)
    context.push(AppRoutes.onboardingVehicleScreen);
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bool hasProfilePhoto = onboarding.profilePhotoUrl != null &&
        onboarding.profilePhotoUrl!.trim().isNotEmpty &&
        onboarding.profilePhotoUrl != 'null' &&
        onboarding.profilePhotoUrl != 'undefined';

    return ValueListenableBuilder<Map<String, dynamic>>(
      valueListenable: DigioService.instance.latestByTypeNotifier,
      builder: (context, latest, _) {
        final vDocs = DigioService.verifiedDocsFromMap(latest);
        final dlkrSummary = (latest['DIGILOCKER'] is Map && latest['DIGILOCKER']['summary'] is Map)
            ? latest['DIGILOCKER']['summary'] as Map
            : const <String, dynamic>{};
        final dlkrDocs = dlkrSummary['verifiedDocs'] is Map
            ? dlkrSummary['verifiedDocs'] as Map
            : const <String, dynamic>{};

        final bool dlVerifiedViaDlkr = vDocs['digilocker'] == true &&
            (dlkrDocs['dl'] == true || dlkrSummary['extractedDl'] != null);
        final bool panVerifiedViaDlkr = vDocs['digilocker'] == true &&
            (dlkrDocs['pan'] == true || dlkrSummary['extractedPan'] != null);

        final bool dlDigitallyVerified =
            vDocs['dl'] == true || onboarding.isDlVerifiedDigitally;
        final bool aadhaarDigitallyVerified =
            vDocs['aadhaar'] == true || onboarding.isAadhaarVerifiedDigitally;
        final bool panDigitallyVerified =
            vDocs['pan'] == true || onboarding.isPanVerifiedDigitally;

        final int uploadedCount = (hasProfilePhoto ? 1 : 0) +
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
                          'Step 2 of 3: Upload your photo and mandatory government documents ($uploadedCount/5 uploaded)',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Digio Express KYC & Govt Verification ────────────
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

                        // ── Document 1: Profile Photo ────────────────────────
                        AppDocumentUploadTile(
                          title: 'Driver Profile Photo *',
                          subtitle: 'Clear front-facing selfie or portrait',
                          icon: Icons.account_circle_outlined,
                          isUploaded: hasProfilePhoto,
                          isUploading: _uploadingState['PROFILE_PHOTO'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('PROFILE_PHOTO', 'Driver Profile Photo'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 2: Driving License ──────────────────────
                        AppDocumentUploadTile(
                          title: 'Driving License *',
                          subtitle: 'Front side of commercial / transport driving license',
                          icon: Icons.badge_outlined,
                          isUploaded: onboarding.drivingLicenseUrl != null,
                          isVerifiedDigitally: dlDigitallyVerified,
                          verifiedBadgeLabel:
                              dlVerifiedViaDlkr ? 'DigiLocker' : 'DL Verified',
                          verifiedSubtitle: dlVerifiedViaDlkr
                              ? 'Verified via DigiLocker — already uploaded'
                              : 'Verified via Govt DL check — no upload needed',
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
                          verifiedBadgeLabel:
                              panVerifiedViaDlkr ? 'DigiLocker' : 'PAN Verified',
                          verifiedSubtitle: panVerifiedViaDlkr
                              ? 'Verified via DigiLocker — already uploaded'
                              : 'Verified via PAN check — no upload needed',
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
                    text: 'CONTINUE TO VEHICLE DETAILS',
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

class _DigioVerifySheetShell extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;
  final String? errorText;
  final bool busy;
  final String submitLabel;
  final Key? submitButtonKey;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;

  const _DigioVerifySheetShell({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
    required this.errorText,
    required this.busy,
    required this.submitLabel,
    this.submitButtonKey,
    required this.onCancel,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(20, 12, 20, bottomInset + 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: isDark ? Colors.grey.shade400 : AppColors.textSecondaryLight,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            child,
            if (errorText != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.35)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        errorText!,
                        style: const TextStyle(color: AppColors.error, fontSize: 12.5, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy ? null : onCancel,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    key: submitButtonKey,
                    onPressed: busy ? null : onSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(submitLabel),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PanVerifyBottomSheet extends StatefulWidget {
  final OnboardingProvider onboarding;
  final BuildContext parentContext;

  const _PanVerifyBottomSheet({
    required this.onboarding,
    required this.parentContext,
  });

  @override
  State<_PanVerifyBottomSheet> createState() => _PanVerifyBottomSheetState();
}

class _PanVerifyBottomSheetState extends State<_PanVerifyBottomSheet> {
  late final TextEditingController _panCtrl;
  bool _busy = false;
  String? _err;

  @override
  void initState() {
    super.initState();
    _panCtrl = TextEditingController(text: widget.onboarding.panNumber);
  }

  @override
  void dispose() {
    _panCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pan = _panCtrl.text.trim().toUpperCase();
    if (!RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$').hasMatch(pan)) {
      setState(() => _err = 'Enter a valid 10-character PAN (e.g. ABCDE1234F)');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final res = await DigioService.instance.verifyPan(
        panNumber: pan,
        name: widget.onboarding.fullName.isNotEmpty ? widget.onboarding.fullName : null,
      );
      if (res['verified'] == true) {
        widget.onboarding.setKycIdentifiers(panNumber: pan);
        widget.onboarding.syncFromDigioLatest(
          DigioService.instance.latestByTypeNotifier.value,
        );
      }
      if (mounted) Navigator.pop(context);
      if (widget.parentContext.mounted) {
        if (res['verified'] == true) {
          AppToast.showSuccess(
            'PAN verified${res['verifiedName'] != null ? ' (${res['verifiedName']})' : ''}',
            context: widget.parentContext,
          );
        } else {
          AppToast.showError(
            res['complianceNotes']?.toString() ?? 'PAN could not be verified',
            context: widget.parentContext,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = AppToast.cleanErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return _DigioVerifySheetShell(
      icon: Icons.credit_card_outlined,
      title: 'Verify PAN Instantly',
      subtitle: 'Verify against Income Tax database via DigiLocker KYC',
      errorText: _err,
      busy: _busy,
      submitLabel: 'Verify PAN',
      submitButtonKey: const Key('pan_verify_submit_btn'),
      onCancel: () => Navigator.pop(context),
      onSubmit: _submit,
      child: TextField(
        key: const Key('pan_verify_input'),
        controller: _panCtrl,
        textCapitalization: TextCapitalization.characters,
        maxLength: 10,
        autofocus: true,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) {
          if (!_busy) _submit();
        },
        decoration: const InputDecoration(
          labelText: 'PAN Number',
          hintText: 'ABCDE1234F',
          border: OutlineInputBorder(),
        ),
      ),
    );
  }
}

class _DlVerifyBottomSheet extends StatefulWidget {
  final OnboardingProvider onboarding;
  final BuildContext parentContext;

  const _DlVerifyBottomSheet({
    required this.onboarding,
    required this.parentContext,
  });

  @override
  State<_DlVerifyBottomSheet> createState() => _DlVerifyBottomSheetState();
}

class _DlVerifyBottomSheetState extends State<_DlVerifyBottomSheet> {
  late final TextEditingController _dlCtrl;
  late final TextEditingController _dobCtrl;
  bool _busy = false;
  String? _err;

  @override
  void initState() {
    super.initState();
    _dlCtrl = TextEditingController(text: widget.onboarding.dlNumber);
    final dob = widget.onboarding.dateOfBirth;
    final defaultDob = dob != null
        ? '${dob.day.toString().padLeft(2, '0')}/${dob.month.toString().padLeft(2, '0')}/${dob.year}'
        : '';
    _dobCtrl = TextEditingController(text: defaultDob);
  }

  @override
  void dispose() {
    _dlCtrl.dispose();
    _dobCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initial = widget.onboarding.dateOfBirth ?? DateTime(now.year - 28, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1940),
      lastDate: DateTime(now.year - 18, now.month, now.day),
    );
    if (picked != null && mounted) {
      _dobCtrl.text =
          '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
    }
  }

  Future<void> _submit() async {
    if (_dlCtrl.text.trim().length < 8 || _dobCtrl.text.trim().length < 8) {
      setState(() => _err = 'Enter valid DL number and DOB (DD/MM/YYYY)');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final cleanDl = _dlCtrl.text.trim().toUpperCase().replaceAll(RegExp(r'\s+'), '');
      final res = await DigioService.instance.verifyDrivingLicense(
        dlNumber: cleanDl,
        dob: _dobCtrl.text.trim(),
        name: widget.onboarding.fullName.isNotEmpty ? widget.onboarding.fullName : null,
      );
      if (res['verified'] == true) {
        widget.onboarding.setKycIdentifiers(dlNumber: cleanDl);
        widget.onboarding.syncFromDigioLatest(
          DigioService.instance.latestByTypeNotifier.value,
        );
      }
      if (mounted) Navigator.pop(context);
      if (widget.parentContext.mounted) {
        if (res['verified'] == true && res['complianceOk'] == true) {
          AppToast.showSuccess('Driving License active & verified!', context: widget.parentContext);
        } else {
          AppToast.showInfo(
            res['complianceNotes']?.toString() ?? 'DL checked',
            context: widget.parentContext,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = AppToast.cleanErrorMessage(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return _DigioVerifySheetShell(
      icon: Icons.badge_outlined,
      title: 'Verify Driving License',
      subtitle: 'Check Parivahan DL status & commercial transport validity',
      errorText: _err,
      busy: _busy,
      submitLabel: 'Verify DL',
      submitButtonKey: const Key('dl_verify_submit_btn'),
      onCancel: () => Navigator.pop(context),
      onSubmit: _submit,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            key: const Key('dl_verify_input'),
            controller: _dlCtrl,
            textCapitalization: TextCapitalization.characters,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'DL Number',
              hintText: 'TS0920200012345',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('dl_dob_input'),
            controller: _dobCtrl,
            keyboardType: TextInputType.datetime,
            decoration: InputDecoration(
              labelText: 'Date of Birth (DD/MM/YYYY)',
              hintText: '14/05/1992',
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                tooltip: 'Select date',
                icon: const Icon(Icons.calendar_today_outlined, size: 18),
                onPressed: _busy ? null : _pickDob,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
