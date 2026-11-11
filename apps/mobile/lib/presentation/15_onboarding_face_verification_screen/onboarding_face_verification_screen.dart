import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Pure representation of a detected face frame for alignment evaluation & unit testing.
class FacePoseObservation {
  final Rect boundingBox;
  final double? headEulerAngleX;
  final double? headEulerAngleY;
  final double? headEulerAngleZ;
  final double? leftEyeOpenProbability;
  final double? rightEyeOpenProbability;

  const FacePoseObservation({
    required this.boundingBox,
    this.headEulerAngleX,
    this.headEulerAngleY,
    this.headEulerAngleZ,
    this.leftEyeOpenProbability,
    this.rightEyeOpenProbability,
  });
}

class FaceAlignmentResult {
  final bool isAligned;
  final String guidance;
  final bool hasFace;

  const FaceAlignmentResult({
    required this.isAligned,
    required this.guidance,
    required this.hasFace,
  });
}

/// Evaluates whether the detected face(s) sit centered, front-facing, eyes-open,
/// and properly sized inside the capture oval so auto-capture can proceed safely.
FaceAlignmentResult evaluateFaceAlignment({
  required List<FacePoseObservation> faces,
  required Size imageSize,
}) {
  if (faces.isEmpty) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: false,
      guidance: 'No face detected — position your face inside the oval',
    );
  }
  if (faces.length > 1) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Multiple faces detected — only the driver should be in frame',
    );
  }
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Initializing face alignment...',
    );
  }

  final face = faces.first;
  final widthRatio = face.boundingBox.width / imageSize.width;
  if (widthRatio < 0.24) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Move slightly closer to the camera',
    );
  }
  if (widthRatio > 0.78) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Move back slightly so your full face fits cleanly',
    );
  }

  final normCenterX = face.boundingBox.center.dx / imageSize.width;
  final normCenterY = face.boundingBox.center.dy / imageSize.height;
  if ((normCenterX - 0.5).abs() > 0.20 || (normCenterY - 0.48).abs() > 0.22) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Center your face inside the oval guide',
    );
  }

  final yaw = face.headEulerAngleY?.abs() ?? 0.0;
  final pitch = face.headEulerAngleX?.abs() ?? 0.0;
  final roll = face.headEulerAngleZ?.abs() ?? 0.0;
  if (yaw > 16 || pitch > 16 || roll > 14) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Look straight at the camera and hold your head level',
    );
  }

  final leftEye = face.leftEyeOpenProbability;
  final rightEye = face.rightEyeOpenProbability;
  if ((leftEye != null && leftEye < 0.35) ||
      (rightEye != null && rightEye < 0.35)) {
    return const FaceAlignmentResult(
      isAligned: false,
      hasFace: true,
      guidance: 'Keep both eyes clearly open',
    );
  }

  return const FaceAlignmentResult(
    isAligned: true,
    hasFace: true,
    guidance: 'Perfect! Hold steady — capturing automatically...',
  );
}

class OnboardingFaceVerificationScreen extends StatefulWidget {
  final Future<List<CameraDescription>> Function()? availableCamerasLoader;
  final Future<bool> Function()? cameraPermissionRequester;

  const OnboardingFaceVerificationScreen({
    super.key,
    this.availableCamerasLoader,
    this.cameraPermissionRequester,
  });

  @override
  State<OnboardingFaceVerificationScreen> createState() =>
      _OnboardingFaceVerificationScreenState();
}

class _OnboardingFaceVerificationScreenState
    extends State<OnboardingFaceVerificationScreen>
    with WidgetsBindingObserver {
  static const int _requiredSteadyFrames = 4;

  CameraController? _cameraController;
  CameraDescription? _frontCamera;
  FaceDetector? _faceDetector;

  bool _isInitializing = true;
  bool _permissionDenied = false;
  bool _permissionPermanentlyDenied = false;
  String? _cameraError;

  bool _isProcessingFrame = false;
  bool _isCapturing = false;
  bool _isUploading = false;
  DateTime _lastFrameAnalyzedAt = DateTime.fromMillisecondsSinceEpoch(0);

  int _steadyFrameCount = 0;
  bool _isAligned = false;
  String _guidance = 'Align your face inside the oval to auto-capture';

  File? _capturedFile;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _faceDetector = FaceDetector(
      options: FaceDetectorOptions(
        enableClassification: true,
        enableLandmarks: true,
        performanceMode: FaceDetectorMode.accurate,
        minFaceSize: 0.22,
      ),
    );
    _initCameraFlow();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized) return;
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      unawaited(_disposeCameraController());
    } else if (state == AppLifecycleState.resumed &&
        _capturedFile == null &&
        _cameraController == null) {
      _initCameraFlow();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_disposeCameraController());
    unawaited(_faceDetector?.close().catchError((_) {}));
    super.dispose();
  }

  Future<void> _disposeCameraController() async {
    final controller = _cameraController;
    _cameraController = null;
    if (controller == null) return;
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {}
    try {
      await controller.dispose();
    } catch (_) {}
  }

  Future<void> _initCameraFlow() async {
    if (!mounted) return;
    setState(() {
      _isInitializing = true;
      _permissionDenied = false;
      _permissionPermanentlyDenied = false;
      _cameraError = null;
      _steadyFrameCount = 0;
      _isAligned = false;
      _guidance = 'Preparing front camera for face verification...';
    });

    try {
      bool granted;
      bool permanentlyDenied = false;
      if (widget.cameraPermissionRequester != null) {
        granted = await widget.cameraPermissionRequester!();
      } else {
        final status = await Permission.camera.request();
        granted = status.isGranted;
        permanentlyDenied = status.isPermanentlyDenied;
      }
      if (!mounted) return;
      if (!granted) {
        setState(() {
          _isInitializing = false;
          _permissionDenied = true;
          _permissionPermanentlyDenied = permanentlyDenied;
          _guidance = 'Camera permission is needed to verify your face.';
        });
        return;
      }

      final loader = widget.availableCamerasLoader ?? availableCameras;
      final cameras = await loader();
      if (!mounted) return;
      if (cameras.isEmpty) {
        setState(() {
          _isInitializing = false;
          _cameraError = 'No camera detected on this device.';
        });
        return;
      }

      _frontCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        _frontCamera!,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isIOS
            ? ImageFormatGroup.bgra8888
            : ImageFormatGroup.nv21,
      );
      _cameraController = controller;
      await controller.initialize();
      if (!mounted) {
        await _disposeCameraController();
        return;
      }

      await controller.startImageStream(_onCameraImage);
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _guidance = 'Position your face inside the oval';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _cameraError =
            'Unable to start the in-app camera. Please grant camera access and retry.';
        debugPrint('FaceVerification camera init error: $e');
      });
    }
  }

  Future<void> _onCameraImage(CameraImage image) async {
    if (!mounted ||
        _capturedFile != null ||
        _isCapturing ||
        _isProcessingFrame ||
        _faceDetector == null ||
        _frontCamera == null) {
      return;
    }

    final now = DateTime.now();
    if (now.difference(_lastFrameAnalyzedAt).inMilliseconds < 240) {
      return;
    }
    _lastFrameAnalyzedAt = now;
    _isProcessingFrame = true;

    try {
      final inputImage = _buildInputImage(image, _frontCamera!);
      if (inputImage == null) return;

      final faces = await _faceDetector!.processImage(inputImage);
      if (!mounted || _capturedFile != null || _isCapturing) return;

      final sensorOrientation = _frontCamera!.sensorOrientation;
      final isRotated =
          sensorOrientation == 90 || sensorOrientation == 270;
      final orientedSize = Size(
        (isRotated ? image.height : image.width).toDouble(),
        (isRotated ? image.width : image.height).toDouble(),
      );

      final result = evaluateFaceAlignment(
        faces: faces
            .map(
              (f) => FacePoseObservation(
                boundingBox: f.boundingBox,
                headEulerAngleX: f.headEulerAngleX,
                headEulerAngleY: f.headEulerAngleY,
                headEulerAngleZ: f.headEulerAngleZ,
                leftEyeOpenProbability: f.leftEyeOpenProbability,
                rightEyeOpenProbability: f.rightEyeOpenProbability,
              ),
            )
            .toList(),
        imageSize: orientedSize,
      );

      int nextSteady = result.isAligned ? _steadyFrameCount + 1 : 0;
      setState(() {
        _isAligned = result.isAligned;
        _steadyFrameCount = nextSteady.clamp(0, _requiredSteadyFrames);
        _guidance = result.guidance;
      });

      if (nextSteady >= _requiredSteadyFrames) {
        await _capturePhoto();
      }
    } catch (e) {
      debugPrint('Face detection frame skipped: $e');
    } finally {
      _isProcessingFrame = false;
    }
  }

  InputImage? _buildInputImage(
    CameraImage image,
    CameraDescription camera,
  ) {
    if (image.planes.isEmpty) return null;
    final rotation =
        InputImageRotationValue.fromRawValue(camera.sensorOrientation) ??
            InputImageRotation.rotation0deg;

    final rawFormat = InputImageFormatValue.fromRawValue(image.format.raw);

    if (Platform.isIOS) {
      final plane = image.planes.first;
      return InputImage.fromBytes(
        bytes: plane.bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: rawFormat ?? InputImageFormat.bgra8888,
          bytesPerRow: plane.bytesPerRow,
        ),
      );
    }

    if (image.planes.length == 1) {
      final plane = image.planes.first;
      return InputImage.fromBytes(
        bytes: plane.bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: rawFormat ?? InputImageFormat.nv21,
          bytesPerRow: plane.bytesPerRow,
        ),
      );
    }

    if (image.planes.length >= 3) {
      final nv21Bytes = _convertYuv420ToNv21(image);
      return InputImage.fromBytes(
        bytes: nv21Bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: InputImageFormat.nv21,
          bytesPerRow: image.width,
        ),
      );
    }

    return null;
  }

  Uint8List _convertYuv420ToNv21(CameraImage image) {
    final width = image.width;
    final height = image.height;
    final ySize = width * height;
    final uvSize = (width * height) ~/ 4;
    final nv21 = Uint8List(ySize + uvSize * 2);

    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];

    final yRowStride = yPlane.bytesPerRow;
    int destIndex = 0;
    for (int row = 0; row < height; row++) {
      final srcOffset = row * yRowStride;
      for (int col = 0; col < width; col++) {
        nv21[destIndex++] = yPlane.bytes[srcOffset + col];
      }
    }

    final uvRowStride = uPlane.bytesPerRow;
    final uvPixelStride = uPlane.bytesPerPixel ?? 1;
    final vRowStride = vPlane.bytesPerRow;
    final vPixelStride = vPlane.bytesPerPixel ?? 1;

    int uvDest = ySize;
    for (int row = 0; row < height ~/ 2; row++) {
      for (int col = 0; col < width ~/ 2; col++) {
        final vIndex = row * vRowStride + col * vPixelStride;
        final uIndex = row * uvRowStride + col * uvPixelStride;
        nv21[uvDest++] = vPlane.bytes[vIndex];
        nv21[uvDest++] = uPlane.bytes[uIndex];
      }
    }
    return nv21;
  }

  Future<void> _capturePhoto() async {
    final controller = _cameraController;
    if (_isCapturing ||
        controller == null ||
        !controller.value.isInitialized) {
      return;
    }

    setState(() {
      _isCapturing = true;
      _guidance = 'Capturing photo...';
    });

    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
      final XFile shot = await controller.takePicture();
      if (!mounted) return;
      setState(() {
        _capturedFile = File(shot.path);
        _isCapturing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isCapturing = false;
        _steadyFrameCount = 0;
        _guidance = 'Capture failed — hold steady and try again';
      });
      try {
        if (!controller.value.isStreamingImages) {
          await controller.startImageStream(_onCameraImage);
        }
      } catch (_) {}
      if (!mounted) return;
      AppToast.showError(e, context: context);
    }
  }

  Future<void> _retake() async {
    setState(() {
      _capturedFile = null;
      _steadyFrameCount = 0;
      _isAligned = false;
      _guidance = 'Position your face inside the oval';
    });
    final controller = _cameraController;
    if (controller != null && controller.value.isInitialized) {
      try {
        if (!controller.value.isStreamingImages) {
          await controller.startImageStream(_onCameraImage);
        }
      } catch (_) {
        await _disposeCameraController();
        await _initCameraFlow();
      }
    } else {
      await _initCameraFlow();
    }
  }

  Future<void> _confirmAndContinue() async {
    final file = _capturedFile;
    if (file == null || _isUploading) return;

    setState(() => _isUploading = true);
    try {
      final onboarding = context.read<OnboardingProvider>();
      final bytes = await file.readAsBytes();
      final fileName = 'driver_face_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final res = await DriverService.instance.uploadProfilePhoto(
        fileBytes: bytes,
        fileName: fileName,
      );
      final uploadedUrl = (res is Map && res['url'] != null)
          ? res['url'].toString()
          : (res is Map && res['data'] is Map && res['data']['url'] != null)
              ? res['data']['url'].toString()
              : '';
      if (uploadedUrl.trim().isEmpty || uploadedUrl == 'null') {
        throw Exception('Upload succeeded but no URL returned from server');
      }
      onboarding.setDocumentUrl('PROFILE_PHOTO', uploadedUrl);

      // Run passive liveness verification in the background without blocking progression.
      unawaited(
        DigioService.instance
            .checkUploadedLiveness(
              fileBytes: bytes,
              fileName: fileName,
            )
            .catchError((_) => <String, dynamic>{}),
      );

      await _disposeCameraController();
      if (!mounted) return;
      AppToast.showSuccess('Face photo captured successfully', context: context);
      context.push(AppRoutes.onboardingVehicleScreen);
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final double holdProgress =
        (_steadyFrameCount / _requiredSteadyFrames).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Header ───────────────────────────────────────────────
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () {
                      if (context.canPop()) {
                        context.pop();
                      } else {
                        context.go(AppRoutes.onboardingDocumentsScreen);
                      }
                    },
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Face Verification',
                          style: AppTypography.h2(
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Center your face in the oval for automatic capture',
                          style: AppTypography.caption(
                            color: isDark
                                ? AppColors.textSecondaryDark
                                : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // ── Live Guidance Banner ─────────────────────────────────
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: (_capturedFile != null || _isAligned
                          ? AppColors.accentGreen
                          : AppColors.primary)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: (_capturedFile != null || _isAligned
                            ? AppColors.accentGreen
                            : AppColors.primary)
                        .withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _capturedFile != null
                          ? Icons.check_circle_rounded
                          : (_isAligned
                              ? Icons.verified_user_rounded
                              : Icons.face_retouching_natural_rounded),
                      size: 20,
                      color: _capturedFile != null || _isAligned
                          ? AppColors.accentGreenDark
                          : AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        _capturedFile != null
                            ? 'Photo captured cleanly. Confirm below to continue.'
                            : _guidance,
                        style: AppTypography.body(
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // ── Main Camera / Captured Preview Viewport ──────────────
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  child: Container(
                    color: Colors.black,
                    child: _buildViewportContent(isDark, holdProgress),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // ── Bottom Actions ───────────────────────────────────────
              if (_capturedFile != null) ...[
                AppPrimaryButton(
                  text: 'CONFIRM & CONTINUE TO VEHICLE DETAILS',
                  isLoading: _isUploading,
                  onPressed: _isUploading ? null : _confirmAndContinue,
                ),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _isUploading ? null : _retake,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Retake Face Photo'),
                  ),
                ),
              ] else if (_cameraController != null &&
                  _cameraController!.value.isInitialized) ...[
                AppPrimaryButton(
                  text: _isCapturing ? 'CAPTURING...' : 'CAPTURE PHOTO NOW',
                  isLoading: _isCapturing,
                  onPressed: _isCapturing ? null : _capturePhoto,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildViewportContent(bool isDark, double holdProgress) {
    if (_capturedFile != null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          Image.file(
            _capturedFile!,
            fit: BoxFit.cover,
          ),
          Positioned(
            bottom: AppSpacing.md,
            left: AppSpacing.md,
            right: AppSpacing.md,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.65),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: const Text(
                'Check that your full face is well-lit and clearly visible.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (_permissionDenied || _cameraError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.no_photography_outlined,
                color: Colors.white70,
                size: 56,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                _permissionDenied
                    ? 'Camera permission is required for live face verification.'
                    : (_cameraError ?? 'Camera unavailable'),
                textAlign: TextAlign.center,
                style: AppTypography.body(color: Colors.white),
              ),
              const SizedBox(height: AppSpacing.lg),
              ElevatedButton.icon(
                onPressed: _permissionPermanentlyDenied
                    ? openAppSettings
                    : _initCameraFlow,
                icon: Icon(
                  _permissionPermanentlyDenied
                      ? Icons.settings_outlined
                      : Icons.refresh_rounded,
                ),
                label: Text(
                  _permissionPermanentlyDenied
                      ? 'Open Settings'
                      : 'Enable Camera & Retry',
                ),
              ),
            ],
          ),
        ),
      );
    }

    final controller = _cameraController;
    if (_isInitializing ||
        controller == null ||
        !controller.value.isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: controller.value.previewSize?.height ?? 480,
            height: controller.value.previewSize?.width ?? 640,
            child: CameraPreview(controller),
          ),
        ),
        CustomPaint(
          painter: _FaceOvalGuidePainter(
            isAligned: _isAligned,
            progress: holdProgress,
          ),
        ),
        Positioned(
          bottom: AppSpacing.md,
          left: AppSpacing.md,
          right: AppSpacing.md,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              _isAligned
                  ? 'Hold still (${(_steadyFrameCount * 100 / _requiredSteadyFrames).round()}%)'
                  : 'Good lighting • Look straight • No sunglasses',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _FaceOvalGuidePainter extends CustomPainter {
  final bool isAligned;
  final double progress;

  _FaceOvalGuidePainter({
    required this.isAligned,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final ovalRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * 0.46),
      width: size.width * 0.66,
      height: size.height * 0.54,
    );

    final backgroundPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addOval(ovalRect)
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(
      backgroundPath,
      Paint()..color = Colors.black.withValues(alpha: 0.45),
    );

    final borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = isAligned ? 4.0 : 2.5
      ..color = isAligned ? AppColors.accentGreen : Colors.white.withValues(alpha: 0.85);
    canvas.drawOval(ovalRect, borderPaint);

    if (progress > 0) {
      final progressPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5.5
        ..strokeCap = StrokeCap.round
        ..color = AppColors.accentGreen;
      canvas.drawArc(
        ovalRect.inflate(4),
        -1.5708, // -90 degrees (top center)
        progress * 6.283185,
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _FaceOvalGuidePainter oldDelegate) {
    return oldDelegate.isAligned != isAligned ||
        oldDelegate.progress != progress;
  }
}
