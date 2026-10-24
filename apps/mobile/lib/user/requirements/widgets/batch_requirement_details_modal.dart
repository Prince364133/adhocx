import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../../routes/app_routes.dart';
import '../../../services/user_service.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_radius.dart';
import '../../../shared/theme/app_spacing.dart';
import '../../../shared/theme/app_typography.dart';
import '../models/cab_cart_item.dart';
import '../models/fleet_template_model.dart';
import '../services/fleet_template_service.dart';
import '../utils/office_hub_detector.dart';
import '../../../core/utils/app_toast.dart';

class BatchRequirementDetailsModal extends StatefulWidget {
  final String groupName;
  final String batchId;
  final List<Map<String, dynamic>> items;
  final VoidCallback onRefreshNeeded;

  const BatchRequirementDetailsModal({
    super.key,
    required this.groupName,
    required this.batchId,
    required this.items,
    required this.onRefreshNeeded,
  });

  @override
  State<BatchRequirementDetailsModal> createState() => _BatchRequirementDetailsModalState();
}

class _BatchRequirementDetailsModalState extends State<BatchRequirementDetailsModal> {
  bool _isSavingTemplate = false;

  int get totalVehicles =>
      widget.items.fold(0, (sum, it) => sum + ((it['quantity'] as num?)?.toInt() ?? 1));

  int get fulfilledVehicles =>
      widget.items.fold(0, (sum, it) => sum + ((it['assignedQuantity'] as num?)?.toInt() ?? 0));

  double get totalAmount => widget.items.fold(
      0.0,
      (sum, it) =>
          sum +
          ((it['totalAmount'] as num?)?.toDouble() ??
              (it['ratePerVehicle'] as num?)?.toDouble() ??
              0.0));

  String get overallStatus {
    if (widget.items.isEmpty) return 'POSTED';
    final allCompleted = widget.items.every(
        (it) => it['status'] == 'COMPLETED' || it['status'] == 'FULFILLED');
    if (allCompleted) return 'COMPLETED';

    final allCancelled = widget.items.every((it) => it['status'] == 'CANCELLED');
    if (allCancelled) return 'CANCELLED';

    final anyInProgress = widget.items.any((it) =>
        it['status'] == 'IN_PROGRESS' ||
        ((it['assignedQuantity'] as num?)?.toInt() ?? 0) > 0);
    if (anyInProgress) return 'IN_PROGRESS';

    final allNoDriver = widget.items.every((it) => it['status'] == 'NO_DRIVER_AVAILABLE');
    if (allNoDriver) return 'NO_DRIVER_AVAILABLE';

    return 'DISPATCHING';
  }

  Color _getStatusColor(String status) {
    if (status == 'COMPLETED' || status == 'FULFILLED') return AppColors.success;
    if (status == 'IN_PROGRESS' || status == 'PARTIALLY_FULFILLED') return AppColors.primary;
    if (status == 'NO_DRIVER_AVAILABLE') return AppColors.warning;
    if (status == 'CANCELLED') return AppColors.error;
    return AppColors.info;
  }

  Future<void> _saveBatchAsTemplate() async {
    setState(() => _isSavingTemplate = true);

    try {
      final List<CabCartItem> templateCabs = [];
      for (int i = 0; i < widget.items.length; i++) {
        final it = widget.items[i];
        final vehicleType = it['vehicleType']?.toString() ?? 'SEDAN';
        final pickupAddress = it['pickupAddress']?.toString() ?? 'Office Hub';
        final dropAddress = it['dropAddress']?.toString() ?? 'Destination';
        final reportingTimeStr = it['reportingTime']?.toString();
        DateTime reporting = DateTime.now().add(const Duration(hours: 4));
        if (reportingTimeStr != null) {
          reporting = DateTime.tryParse(reportingTimeStr) ?? reporting;
        }

        final fare = (it['ratePerVehicle'] as num?)?.toDouble() ??
            (it['totalAmount'] as num?)?.toDouble() ??
            800.0;

        final notes = it['notes']?.toString() ?? '';
        final direction = CabCartItem.parseDirection(notes);
        final pickupInstructions = CabCartItem.parsePickupGuide(notes);
        final dropInstructions = CabCartItem.parseDropGuide(notes);

        final pLat = (it['pickupLocation']?['latitude'] as num?)?.toDouble() ?? 17.4435;
        final pLng = (it['pickupLocation']?['longitude'] as num?)?.toDouble() ?? 78.3772;
        final dLat = (it['dropLocation']?['latitude'] as num?)?.toDouble() ?? 17.3850;
        final dLng = (it['dropLocation']?['longitude'] as num?)?.toDouble() ?? 78.4867;

        final isOutbound = direction == 'OUTBOUND_FROM_OFFICE';
        final officeAddress = isOutbound ? pickupAddress : dropAddress;
        final officeLat = isOutbound ? pLat : dLat;
        final officeLng = isOutbound ? pLng : dLng;
        final localityAddress = isOutbound ? dropAddress : pickupAddress;

        final detectedHub = OfficeHubDetector.detectHub(
          lat: officeLat,
          lng: officeLng,
          addressText: officeAddress,
        ) ?? OfficeHubDetector.hitecId;

        templateCabs.add(
          CabCartItem(
            id: 'tmpl_cab_${DateTime.now().millisecondsSinceEpoch}_$i',
            vehicleType: vehicleType,
            vehicleLabel: vehicleType == 'SUV' ? 'SUV 7 Seater' : 'Prime Sedan',
            passengers: 4,
            direction: direction,
            officeHubId: detectedHub,
            officeAddress: officeAddress,
            officeLat: officeLat,
            officeLng: officeLng,
            localityName: localityAddress.split(',').first.trim(),
            pickupAddress: pickupAddress,
            pickupLat: pLat,
            pickupLng: pLng,
            pickupInstructions: pickupInstructions,
            dropAddress: dropAddress,
            dropLat: dLat,
            dropLng: dLng,
            dropInstructions: dropInstructions,
            tripType: 'One Way',
            hasEscort: false,
            pickupDate: '${reporting.year}-${reporting.month.toString().padLeft(2, '0')}-${reporting.day.toString().padLeft(2, '0')}',
            pickupTime: '${reporting.hour > 12 ? reporting.hour - 12 : (reporting.hour == 0 ? 12 : reporting.hour)}:${reporting.minute.toString().padLeft(2, '0')} ${reporting.hour >= 12 ? 'PM' : 'AM'}',
            reportingDateTime: reporting,
            estimatedFare: fare,
          ),
        );
      }

      final template = FleetTemplate(
        id: 'tmpl_${DateTime.now().millisecondsSinceEpoch}',
        name: widget.groupName,
        cabs: templateCabs,
        createdAt: DateTime.now(),
        notes: 'Saved from batch ${widget.batchId}',
      );

      await FleetTemplateService.instance.saveTemplate(template);

      Fluttertoast.showToast(
        msg: 'Batch saved as template "${widget.groupName}"! Available for 1-click daily runs.',
        backgroundColor: AppColors.success,
        textColor: Colors.white,
      );
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isSavingTemplate = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final statusColor = _getStatusColor(overallStatus);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            // Handle Bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.slate700 : AppColors.slate300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Modal Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: const Icon(Icons.corporate_fare_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.groupName,
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Batch ID: ${widget.batchId}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Group Metrics Card & Save as Template Button
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Status badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Text(
                          overallStatus.replaceAll('_', ' '),
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      // Fulfilled indicator
                      Text(
                        'Progress: $fulfilledVehicles/$totalVehicles Fulfilled',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    child: LinearProgressIndicator(
                      value: totalVehicles > 0 ? (fulfilledVehicles / totalVehicles) : 0.0,
                      backgroundColor: isDark ? AppColors.slate800 : AppColors.slate200,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        fulfilledVehicles == totalVehicles ? AppColors.success : AppColors.primary,
                      ),
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Manifest Fare: ₹${totalAmount.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: _isSavingTemplate ? null : _saveBatchAsTemplate,
                        icon: const Icon(Icons.bookmark_add_outlined, size: 16),
                        label: const Text('Save as Template', style: TextStyle(fontSize: 11)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Subheader: Individual Cabs / Orders
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
              child: Row(
                children: [
                  Text(
                    'Vehicles & Orders in this Batch (${widget.items.length})',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                ],
              ),
            ),

            // List of Individual Cabs in this Batch
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
                itemCount: widget.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final item = widget.items[index];
                  return _buildCabItemCard(item, index + 1, isDark);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCabItemCard(Map<String, dynamic> item, int index, bool isDark) {
    final String id = item['id'] ?? '';
    final String vehicle = item['vehicleType'] ?? 'Sedan';
    final String pickup = item['pickupAddress'] ?? 'Pickup location';
    final String drop = item['dropAddress'] ?? 'Drop location';
    final String status = item['status'] ?? 'POSTED';
    final double amount = (item['ratePerVehicle'] as num?)?.toDouble() ??
        (item['totalAmount'] as num?)?.toDouble() ??
        0.0;

    final Color itemStatusColor = _getStatusColor(status);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Cab index, Vehicle, Status & Fare
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      'Cab #$index',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    vehicle,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ],
              ),
              Row(
                children: [
                  Text(
                    '₹${amount.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: itemStatusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      status.replaceAll('_', ' '),
                      style: TextStyle(
                        color: itemStatusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Pickup and Drop locations
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.trip_origin, size: 12, color: AppColors.primary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  pickup,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on, size: 12, color: AppColors.accentPurple),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  drop,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Action row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (status == 'NO_DRIVER_AVAILABLE')
                TextButton.icon(
                  onPressed: () async {
                    try {
                      await UserService.instance.retryRequirement(id);
                      Fluttertoast.showToast(msg: 'Retrying driver dispatch for Cab #$index...');
                      widget.onRefreshNeeded();
                    } catch (e) {
                      AppToast.showError(e);
                    }
                  },
                  icon: const Icon(Icons.refresh, size: 14, color: AppColors.warning),
                  label: const Text('Retry Dispatch', style: TextStyle(fontSize: 11, color: AppColors.warning)),
                  style: TextButton.styleFrom(padding: EdgeInsets.zero),
                )
              else
                const SizedBox.shrink(),

              // View Full Trip Details Button
              InkWell(
                onTap: () {
                  Navigator.pop(context); // close batch sheet
                  context.push(
                    AppRoutes.userRequirementDetailsScreen,
                    extra: {'id': id, 'initialData': item},
                  );
                },
                borderRadius: BorderRadius.circular(AppRadius.sm),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Row(
                    children: [
                      Text(
                        'View Trip Details',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios, size: 10, color: AppColors.primary),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
