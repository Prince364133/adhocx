import 'package:adhocx_employee/shared/components/feedback/skeleton_loading.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget child, {Brightness brightness = Brightness.light}) {
  return MaterialApp(
    theme: brightness == Brightness.light
        ? AppTheme.lightTheme
        : AppTheme.darkTheme,
    home: Scaffold(body: child),
  );
}

void main() {
  testWidgets('renders centralized reusable skeleton primitives',
      (tester) async {
    await tester.pumpWidget(_app(
      const Column(
        children: [
          SkeletonBone(width: 120, height: 16),
          SizedBox(height: 12),
          SkeletonAvatar(size: 44),
          SizedBox(height: 12),
          SkeletonButton(height: 48),
        ],
      ),
    ));

    expect(find.byType(SkeletonBone), findsNWidgets(3));
    expect(find.byType(SkeletonAvatar), findsOneWidget);
    expect(find.byType(SkeletonButton), findsOneWidget);
  });

  testWidgets('adapts to dark theme', (tester) async {
    await tester.pumpWidget(_app(
      const SkeletonCard(
        child: SkeletonListItem(hasTrailing: false),
      ),
      brightness: Brightness.dark,
    ));

    expect(find.byType(SkeletonCard), findsWidgets);
    expect(find.byType(SkeletonListItem), findsOneWidget);
  });

  testWidgets('reduced motion renders without an active repeat',
      (tester) async {
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: _app(const SkeletonContainer(layout: SkeletonLayout.home)),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(SkeletonContainer), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('page-specific layouts match available variants',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 2000));
    for (final layout in SkeletonLayout.values) {
      await tester.pumpWidget(_app(SkeletonContainer(layout: layout)));
      await tester.pump();
      expect(find.byType(SkeletonContainer), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
  });
}
