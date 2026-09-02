import 'dart:typed_data'; 
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../routes/app_routes.dart';
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

  // ─── Helper function to upload files to Supabase Storage ──────────────
  Future<String?> _uploadToStorage(String? localPath, Uint8List? bytes, String prefix) async {
    if (localPath == null || localPath.isEmpty) return null;

    // If it is already a valid cloud path from a previous upload, skip upload
    if (!localPath.startsWith('blob:') && !localPath.startsWith('/') && !localPath.startsWith('file://')) {
      return localPath;
    }

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return null;

      final fileName = '${user.id}/${prefix}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      
      // FIX: Matches exact case of Supabase Storage Bucket
      final storage = Supabase.instance.client.storage.from('kyc-documents');

      if (bytes != null) {
        await storage.uploadBinary(fileName, bytes);
      } else {
        final response = await http.get(Uri.parse(localPath));
        await storage.uploadBinary(fileName, response.bodyBytes);
      }

      // Return the clean relative path to save in the database
      return fileName;
    } catch (e) {
      debugPrint('Storage Upload Error for $prefix: $e');
      throw Exception('Failed to upload $prefix document. Please try again.');
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
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        throw Exception('You must be signed in to submit KYC.');
      }

      // 1. Upload all local images to Supabase Storage first
      final selfiePath = await _uploadToStorage(_selfieUrl, null, 'selfie');
      final dlFrontPath = await _uploadToStorage(_uploadedDocs['dl_front'], _docBytes['dl_front'], 'dl_front');
      final dlBackPath = await _uploadToStorage(_uploadedDocs['dl_back'], _docBytes['dl_back'], 'dl_back');
      final rcBookPath = await _uploadToStorage(_uploadedDocs['rc_book'], _docBytes['rc_book'], 'rc_book');
      final insurancePath = await _uploadToStorage(_uploadedDocs['insurance'], _docBytes['insurance'], 'insurance');
      final aadhaarPath = await _uploadToStorage(_uploadedDocs['aadhaar_doc'], _docBytes['aadhaar_doc'], 'aadhaar');

      // 2. Map vehicle_type to the ENUM values expected by driver_profiles
      final rawVehicleType = (_formData['vehicle_type'] as String?) ?? 'Sedan';
      final vehicleTypeEnum = rawVehicleType.toLowerCase() == 'suv' ? 'SUV' : 'Sedan';

      // 3. Upsert into the database using the new cloud paths
      await Supabase.instance.client.from('driver_profiles').upsert({
        'user_id': user.id,
        // Identity
        'full_name': _formData['full_name'],
        'phone': _formData['phone'],
        'aadhaar_number': _formData['aadhaar'],
        'pan_number': _formData['pan'],
        // Driving
        'dl_number': _formData['dl_number'],
        // Vehicle
        'vehicle_type': vehicleTypeEnum,
        'vehicle_number': _formData['vehicle_number'],
        'vehicle_plate': _formData['vehicle_number'],
        'rc_number': _formData['rc_number'],
        // Banking
        'bank_account_name': _formData['account_holder_name'],
        'bank_name': _formData['bank_name'],
        'bank_account_number': _formData['account_number'],
        'bank_ifsc': _formData['ifsc'],
        // Document URLs 
        'profile_photo_url': selfiePath ?? _selfieUrl,
        'dl_front_url': dlFrontPath ?? _uploadedDocs['dl_front'],
        'dl_back_url': dlBackPath ?? _uploadedDocs['dl_back'],
        'rc_document_url': rcBookPath ?? _uploadedDocs['rc_book'],
        'insurance_document_url': insurancePath ?? _uploadedDocs['insurance'],
        'aadhaar_document_url': aadhaarPath ?? _uploadedDocs['aadhaar_doc'],
        // Status — mark as submitted for admin review
        'approval_status': 'pending',
        'is_approved': false,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id');

      if (!mounted) return;
      setState(() => _isSubmitting = false);
      Fluttertoast.showToast(
        msg: 'KYC submitted! Awaiting admin review.',
        toastLength: Toast.LENGTH_LONG,
      );
      context.go(AppRoutes.waitlistGateScreen);
      
    } on PostgrestException catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _submitError = e.message;
      });
      debugPrint('KYC upsert PostgrestException: $e');
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
    return Scaffold(
      backgroundColor: Colors.black, 
      appBar: AppBar(
        backgroundColor: Colors.black, 
        leading: GestureDetector(
          onTap: () {
            if (context.canPop()) {
              context.pop(); 
            } else {
              context.go(AppRoutes.authScreen); 
            }
          },
          child: const Icon(Icons.arrow_back_rounded, color: Colors.white),
        ),
        title: const Text(
          'KYC Onboarding',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: Colors.white24), 
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
                      color: const Color(0xFFef4444).withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFFef4444).withAlpha(77),
                      ),
                    ),
                    child: Text(
                      _submitError!,
                      style: const TextStyle(
                        color: Color(0xFFef4444),
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
                      backgroundColor: Colors.green, 
                      foregroundColor: Colors.white, 
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      disabledBackgroundColor: Colors.green.withValues(alpha: 0.4),
                    ),
                    child: _isSubmitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white, 
                                ),
                              ),
                              SizedBox(width: 12),
                              Text(
                                'Submitting...',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                            ],
                          )
                        : const Text(
                            'Submit KYC for Review',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
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