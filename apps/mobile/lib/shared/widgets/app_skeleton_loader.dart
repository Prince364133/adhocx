import 'package:flutter/material.dart';
import 'app_adaptive_skeleton.dart';

export 'app_adaptive_skeleton.dart';

/// Legacy skeleton helper, now powered by the universal [AdaptiveSkeleton] engine.
class AppSkeletonLoader extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const AppSkeletonLoader({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = 8.0,
  });

  @override
  Widget build(BuildContext context) {
    return AdaptiveSkeleton.bone(
      width: width == double.infinity ? null : width,
      height: height,
      borderRadius: borderRadius,
    );
  }

  /// Legacy card list helper, now wrapped in [AdaptiveSkeleton].
  static Widget cardList({int count = 3}) {
    return AdaptiveSkeleton.repeat(
      isLoading: true,
      mockCount: count,
      mockBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Bone(height: 16, width: 140),
              SizedBox(height: 8),
              Bone(height: 12, width: 220),
              SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Bone(height: 12, width: 80),
                  Bone(height: 12, width: 60),
                ],
              ),
            ],
          ),
        );
      },
      child: const SizedBox.shrink(),
    );
  }
}
