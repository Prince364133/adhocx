/// AdhocX Employee component library.
///
/// Everything here is built on the Driver app design system (exact copies in
/// `lib/theme/` and `lib/widgets/common/`). Prefer the driver widgets
/// directly (`widgets/common/common.dart`) for generic UI; these wrappers add
/// employee-specific variants (trip/driver cards, trip status, step tracker,
/// greeting header, bottom navigation).
library;

// Driver app shared widgets (exact copies)
export '../../widgets/common/common.dart';

// Badges
export 'badges/employee_status_badge.dart';

// Buttons
export 'buttons/employee_primary_button.dart';
export 'buttons/employee_secondary_button.dart';
export 'buttons/employee_danger_button.dart';
export 'buttons/employee_pill_filter.dart';

// Cards
export 'cards/employee_hero_trip_card.dart';
export 'cards/employee_trip_card.dart';
export 'cards/employee_driver_card.dart';

// Sheets
export 'sheets/employee_confirmation_sheet.dart';

// Navigation
export 'navigation/employee_app_bar.dart';
export 'navigation/employee_bottom_nav_bar.dart';

// Feedback
export 'feedback/employee_empty_state.dart';
export 'feedback/employee_entrance.dart';
export 'feedback/employee_page_transition.dart';
export 'feedback/employee_press_scale.dart';
export 'feedback/employee_step_tracker.dart';

// Inputs
export 'inputs/employee_otp_input.dart';
