import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../services/auth_service.dart';

import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import './widgets/kyc_banking_section_widget.dart';
import './widgets/kyc_documents_section_widget.dart';
import './widgets/kyc_driving_section_widget.dart';
import './widgets/kyc_identity_section_widget.dart';
import './widgets/kyc_selfie_widget.dart';
import './widgets/kyc_vehicle_section_widget.dart';

class KycUploadScreen extends StatefulWidget {
  const KycUploadScreen({super.key});

  @override
  State<KycUploadScreen> createState() => _KycUploadScreenState();
}

class _KycUploadScreenState extends State<KycUploadScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isSubmitting = false;
  String? _submitError;

  // Form data holders
  final Map<String, dynamic> _formData = {
    'full_name': '',
    'phone': '',
    'aadhaar': '',
    'pan': '',
    'dl_number': '',
    'vehicle_type': 'Sedan',
    'vehicle_number': '',
    'rc_number': '',
    'account_holder_name': '',
    'bank_name': '',
    'account_number': '',
    'ifsc': '',
  };

  String? _selfieUrl;
  final Map<String, String?> _uploadedDocs = {
    'dl_front': null,
    'dl_back': null,
    'rc_book': null,
    'insurance': null,
    'aadhaar_doc': null,
  };

  final Map<String, Uint8List?> _docBytes = {};

  // ─── Helper function to upload files to Cloudflare R2 via DriverService ──────────────
  Future<String?> _uploadToStorage(String? localPath, Uint8List? bytes, String prefix) async {
    if (localPath == null || localPath.isEmpty) return null;

    // If it is already a valid cloud path from a previous upload, skip upload
    if (!localPath.startsWith('blob:') && !localPath.startsWith('/') && !localPath.startsWith('file://')) {
      return localPath;
    }

    try {
      final List<int> fileBytes = bytes ?? (await http.get(Uri.parse(localPath))).bodyBytes;
      final fileName = '${prefix}_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final res = await DriverService.instance.uploadKycDocument(
        documentType: prefix.toUpperCase(),
        fileBytes: fileBytes,
        fileName: fileName,
      );

      if (res is Map<String, dynamic>) {
        return res['url'] ?? res['fileUrl'] ?? res['data']?['url']?.toString() ?? fileName;
      }
      return fileName;
    } catch (e) {
      debugPrint('Cloudflare R2 Upload Error for $prefix: $e');
      return null;
    }
  }

  Future<void> _submitKyc() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });

    try {
      final user = AuthService.instance.currentUser;
      if (user == null) {
        throw Exception('You must be signed in to submit KYC.');
      }

      // 1. Upload all local images to Cloudflare R2 first
      final selfiePath = await _uploadToStorage(_selfieUrl, null, 'selfie');
      final dlFrontPath = await _uploadToStorage(_uploadedDocs['dl_front'], _docBytes['dl_front'], 'dl_front');
      final dlBackPath = await _uploadToStorage(_uploadedDocs['dl_back'], _docBytes['dl_back'], 'dl_back');
      final rcBookPath = await _uploadToStorage(_uploadedDocs['rc_book'], _docBytes['rc_book'], 'rc_book');
      final insurancePath = await _uploadToStorage(_uploadedDocs['insurance'], _docBytes['insurance'], 'insurance');
      final aadhaarPath = await _uploadToStorage(_uploadedDocs['aadhaar_doc'], _docBytes['aadhaar_doc'], 'aadhaar');

      // 2. Map dynamic vehicle_type for authoritative database
      final rawVehicleType = (_formData['vehicle_type'] as String?) ?? 'SEDAN';
      final dynamicVehicleType = rawVehicleType.toUpperCase();

      // 3. Authoritative Backend Update via DriverService
      await DriverService.instance.updateProfile({
        'fullName': _formData['full_name'],
        'phone': _formData['phone'],
        'vehicleType': dynamicVehicleType,
        'vehiclePlate': (_formData['vehicle_number'] as String?)?.toUpperCase(),
        'rcNumber': (_formData['rc_number'] as String?)?.toUpperCase(),
        'dlNumber': (_formData['dl_number'] as String?)?.toUpperCase(),
        'profilePhotoUrl': selfiePath ?? _selfieUrl,
        'dlFrontUrl': dlFrontPath ?? _uploadedDocs['dl_front'],
        'dlBackUrl': dlBackPath ?? _uploadedDocs['dl_back'],
        'rcDocUrl': rcBookPath ?? _uploadedDocs['rc_book'],
        'insuranceDocUrl': insurancePath ?? _uploadedDocs['insurance'],
        'aadharFrontUrl': aadhaarPath ?? _uploadedDocs['aadhaar_doc'],
      });

      if (!mounted) return;
      setState(() => _isSubmitting = false);
      Fluttertoast.showToast(
        msg: 'KYC submitted! Awaiting admin review.',
        toastLength: Toast.LENGTH_LONG,
      );
      context.go(AppRoutes.waitlistGateScreen);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _submitError = e.toString().contains('Failed to upload')
            ? e.toString()
            : 'Submission failed. Please try again.';
      });
      debugPrint('KYC submit error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        elevation: 0,
        leading: GestureDetector(
          onTap: () {
            if (context.canPop()) {
              context.pop(); 
            } else {
              context.go(AppRoutes.authScreen); 
            }
          },
          child: Icon(
            Icons.arrow_back_rounded,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
        title: Text(
          'KYC Onboarding',
          style: TextStyle(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ), 
        ),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                KycSelfieWidget(
                  selfieUrl: _selfieUrl,
                  onSelfieChanged: (url) => setState(() => _selfieUrl = url),
                ),
                const SizedBox(height: 24),
                KycIdentitySectionWidget(
                  onSaved: (data) => _formData.addAll(data),
                ),
                const SizedBox(height: 24),
                KycDrivingSectionWidget(
                  onSaved: (data) => _formData.addAll(data),
                ),
                const SizedBox(height: 24),
                KycVehicleSectionWidget(
                  initialVehicleType: _formData['vehicle_type'] as String,
                  onVehicleTypeChanged: (type) =>
                      setState(() => _formData['vehicle_type'] = type),
                  onSaved: (data) => _formData.addAll(data),
                ),
                const SizedBox(height: 24),
                KycBankingSectionWidget(
                  onSaved: (data) => _formData.addAll(data),
                ),
                const SizedBox(height: 24),
                
                KycDocumentsSectionWidget(
                  uploadedDocs: _uploadedDocs,
                  onDocUploaded: (key, filePath, fileBytes) {
                    setState(() {
                      _uploadedDocs[key] = filePath;
                      _docBytes[key] = fileBytes;
                    });
                  },
                ),
                
                if (_submitError != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.error.withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.error.withAlpha(77),
                      ),
                    ),
                    child: Text(
                      _submitError!,
                      style: TextStyle(
                        color: AppColors.error,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submitKyc,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark, 
                      foregroundColor: isDark ? AppColors.bgDark : Colors.white, 
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      disabledBackgroundColor: (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark).withValues(alpha: 0.4),
                    ),
                    child: _isSubmitting
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: isDark ? AppColors.bgDark : Colors.white, 
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                'Submitting...',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                  color: isDark ? AppColors.bgDark : Colors.white,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            'Submit KYC for Review',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: isDark ? AppColors.bgDark : Colors.white,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}