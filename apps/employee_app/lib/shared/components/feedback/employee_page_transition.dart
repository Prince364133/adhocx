import 'package:flutter/material.dart';

class EmployeePageTransition extends PageTransitionsBuilder {
  const EmployeePageTransition();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}
