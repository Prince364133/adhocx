import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'requirement_draft_provider.dart';

class UserCreateRequirementScreen extends StatefulWidget {
  const UserCreateRequirementScreen({super.key});

  @override
  State<UserCreateRequirementScreen> createState() => _UserCreateRequirementScreenState();
}

class _UserCreateRequirementScreenState extends State<UserCreateRequirementScreen> {
  late String _selectedFulfillmentMode;
  late String _selectedVehicleType;
  late int _quantity;
  late TextEditingController _specialRequestsController;
  bool _initialized = false;

  final List<Map<String, dynamic>> _vehicleOptions = [
    {
      'id': 'Sedan',
      'label': 'Sedan',
      'subtitle': '4 Seater (Dzire, Etios, Aura)',
      'icon': Icons.directions_car_rounded,
    },
    {
      'id': 'SUV',
      'label': 'SUV',
      'subtitle': '6-7 Seater (Innova, Ertiga, XUV)',
      'icon': Icons.airport_shuttle_rounded,
    },
    {
      'id': 'Hatchback',
      'label': 'Hatchback',
      'subtitle': '4 Seater (WagonR, Swift, i10)',
      'icon': Icons.directions_car_filled_rounded,
    },
    {
      'id': 'Tempo Traveller',
      'label': 'Tempo Traveller',
      'subtitle': '12-26 Seater (Force Traveller)',
      'icon': Icons.directions_bus_rounded,
    },
    {
      'id': 'Tata Ace',
      'label': 'Tata Ace',
      'subtitle': 'Mini Truck (750kg payload)',
      'icon': Icons.local_shipping_rounded,
    },
    {
      'id': 'Pickup Truck',
      'label': 'Pickup Truck',
      'subtitle': 'Commercial Cargo (1-1.5 Ton)',
      'icon': Icons.fire_truck_rounded,
    },
    {
      'id': 'Bus',
      'label': 'Bus',
      'subtitle': '30+ Seater Luxury Bus',
      'icon': Icons.directions_bus_filled_rounded,
    },
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final draft = context.read<RequirementDraftProvider>();
      _selectedFulfillmentMode = draft.fulfillmentMode;
      _selectedVehicleType = draft.vehicleType;
      // Ensure selected vehicle is valid
      if (!_vehicleOptions.any((v) => v['id'] == _selectedVehicleType)) {
        _selectedVehicleType = 'Sedan';
      }
      _quantity = draft.quantity;
      _specialRequestsController = TextEditingController(text: draft.specialRequests);
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _specialRequestsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final selectedVehicleData = _vehicleOptions.firstWhere(
      (v) => v['id'] == _selectedVehicleType,
      orElse: () => _vehicleOptions.first,
    );

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Create Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () => context.push(AppRoutes.userBulkPostingScreen),
            icon: Icon(Icons.tune, color: AppColors.primary),
            tooltip: 'Bulk Upload CSV',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper Header (1, 2, 3, 4, 5)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(5, (index) {
                  final stepNum = index + 1;
                  final isActive = stepNum == 1;
                  return CircleAvatar(
                    radius: 14,
                    backgroundColor: isActive ? AppColors.primary : (isDark ? AppColors.slate800 : AppColors.slate300),
                    child: Text(
                      '$stepNum',
                      style: TextStyle(
                        fontSize: 12,
                        color: isActive ? Colors.white : AppColors.slate600,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Booking Category Selector (Corporate Bulk vs Outstation Trip)
                    Text(
                      'Booking Category *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() {
                              _selectedFulfillmentMode = 'DIRECT_DISPATCH';
                            }),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                              decoration: BoxDecoration(
                                color: _selectedFulfillmentMode == 'DIRECT_DISPATCH'
                                    ? AppColors.primary.withValues(alpha: 0.12)
                                    : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                border: Border.all(
                                  color: _selectedFulfillmentMode == 'DIRECT_DISPATCH'
                                      ? AppColors.primary
                                      : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                  width: _selectedFulfillmentMode == 'DIRECT_DISPATCH' ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.flash_on_rounded, size: 16, color: AppColors.primary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Corporate Bulk',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: _selectedFulfillmentMode == 'DIRECT_DISPATCH' ? AppColors.primary : null,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Direct Timed Dispatch',
                                    style: TextStyle(fontSize: 11, color: isDark ? AppColors.slate400 : AppColors.slate600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() {
                              _selectedFulfillmentMode = 'BIDDING';
                              _quantity = 1;
                            }),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                              decoration: BoxDecoration(
                                color: _selectedFulfillmentMode == 'BIDDING'
                                    ? AppColors.primary.withValues(alpha: 0.12)
                                    : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                border: Border.all(
                                  color: _selectedFulfillmentMode == 'BIDDING'
                                      ? AppColors.primary
                                      : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                  width: _selectedFulfillmentMode == 'BIDDING' ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.gavel_rounded, size: 16, color: AppColors.primary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Outstation Trip',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: _selectedFulfillmentMode == 'BIDDING' ? AppColors.primary : null,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Reverse Auction Quotes',
                                    style: TextStyle(fontSize: 11, color: isDark ? AppColors.slate400 : AppColors.slate600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // Vehicle Type Dropdown Selector
                    Text(
                      'Vehicle Type *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),

                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedVehicleType,
                          isExpanded: true,
                          icon: Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.primary),
                          dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          selectedItemBuilder: (BuildContext context) {
                            return _vehicleOptions.map((v) {
                              return Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: Icon(v['icon'] as IconData, size: 20, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          v['label'] as String,
                                          style: AppTypography.body(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          v['subtitle'] as String,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            }).toList();
                          },
                          items: _vehicleOptions.map((v) {
                            final isSelected = v['id'] == _selectedVehicleType;
                            return DropdownMenuItem<String>(
                              value: v['id'] as String,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 6.0),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? AppColors.primary.withValues(alpha: 0.15)
                                            : (isDark ? AppColors.slate800 : AppColors.slate100),
                                        borderRadius: BorderRadius.circular(AppRadius.sm),
                                      ),
                                      child: Icon(
                                        v['icon'] as IconData,
                                        size: 20,
                                        color: isSelected ? AppColors.primary : (isDark ? AppColors.slate400 : AppColors.slate600),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            v['label'] as String,
                                            style: TextStyle(
                                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                              fontSize: 14,
                                              color: isSelected
                                                  ? AppColors.primary
                                                  : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                            ),
                                          ),
                                          Text(
                                            v['subtitle'] as String,
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (isSelected)
                                      Icon(Icons.check_circle_rounded, size: 18, color: AppColors.primary),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                          onChanged: (newVal) {
                            if (newVal != null) {
                              setState(() => _selectedVehicleType = newVal);
                            }
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Quantity Stepper
                    Text(
                      'Quantity *',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          IconButton(
                            onPressed: () {
                              if (_quantity > 1) setState(() => _quantity--);
                            },
                            icon: Icon(Icons.remove, color: AppColors.primary),
                          ),
                          Text(
                            '$_quantity',
                            style: AppTypography.h2(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          IconButton(
                            onPressed: () {
                              setState(() => _quantity++);
                            },
                            icon: Icon(Icons.add, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Special Requests (Optional)
                    Text(
                      'Special Requests (Optional)',
                      style: AppTypography.h4(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _specialRequestsController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Any specific vehicle or driver requirements.',
                        hintStyle: TextStyle(fontSize: 13, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Continue Button -> Step 2
                    AppPrimaryButton(
                      text: 'Continue →',
                      onPressed: () {
                        final draft = context.read<RequirementDraftProvider>();
                        draft.updateStep1(
                          fulfillmentMode: _selectedFulfillmentMode,
                          vehicleType: _selectedVehicleType,
                          quantity: _quantity,
                          specialRequests: _specialRequestsController.text.trim(),
                        );
                        context.push(AppRoutes.userCreateRequirementStep2Screen);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
