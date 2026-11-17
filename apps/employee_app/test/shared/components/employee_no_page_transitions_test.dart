import 'package:adhocx_employee/shared/components/feedback/employee_no_page_transitions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('page transition builder returns the page unchanged',
      (tester) async {
    final child = const Text('Page');
    Widget? transitionedChild;

    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) {
          transitionedChild =
              const EmployeeNoPageTransitionsBuilder().buildTransitions(
            MaterialPageRoute<void>(builder: (_) => child),
            context,
            const AlwaysStoppedAnimation<double>(0),
            const AlwaysStoppedAnimation<double>(1),
            child,
          );
          return transitionedChild!;
        },
      ),
    ));

    expect(identical(transitionedChild, child), isTrue);
  });
}
