import 'package:flutter/material.dart';

class EmployeeNoPageTransitionsBuilder extends PageTransitionsBuilder {
  const EmployeeNoPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) =>
      child;
}
