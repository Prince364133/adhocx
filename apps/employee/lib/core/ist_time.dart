/// Corporate ETS times are IST wall-clock (apps/api cutoff-policy.ts: Asia/Kolkata, UTC+05:30,
/// no DST). Every instant is shown in IST with an explicit suffix, whatever the device timezone,
/// so an employee travelling or with a mis-set phone never misreads a pickup or cutoff time.
class IstTime {
  IstTime._();

  static const Duration offset = Duration(hours: 5, minutes: 30);
  static const List<String> _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  static const List<String> _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /// The instant as an IST wall-clock value (a UTC DateTime whose fields read as IST).
  static DateTime toIst(DateTime instant) => instant.toUtc().add(offset);

  static String _two(int n) => n.toString().padLeft(2, '0');

  /// `07:05`
  static String clock(DateTime instant) {
    final t = toIst(instant);
    return '${_two(t.hour)}:${_two(t.minute)}';
  }

  /// `07:05 IST`
  static String clockIst(DateTime instant) => '${clock(instant)} IST';

  /// `Thu 5 Nov`
  static String day(DateTime instant) {
    final t = toIst(instant);
    return '${_days[t.weekday - 1]} ${t.day} ${_months[t.month - 1]}';
  }

  /// `Thu 5 Nov, 07:05 IST`
  static String dayClock(DateTime instant) => '${day(instant)}, ${clockIst(instant)}';

  /// `Thu 5 Nov` for a `YYYY-MM-DD` calendar date (no timezone shift).
  static String calendarDay(String yyyyMmDd) {
    final d = DateTime.tryParse('${yyyyMmDd}T00:00:00Z');
    if (d == null) return yyyyMmDd;
    return '${_days[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
  }

  /// `YYYY-MM-DD` of the instant in IST.
  static String isoDate(DateTime instant) {
    final t = toIst(instant);
    return '${t.year}-${_two(t.month)}-${_two(t.day)}';
  }

  /// `2 h 05 min`, `12 min`, `45 s`
  static String duration(Duration d) {
    if (d.isNegative) return '0 s';
    if (d.inHours > 0) return '${d.inHours} h ${_two(d.inMinutes % 60)} min';
    if (d.inMinutes > 0) return '${d.inMinutes} min';
    return '${d.inSeconds} s';
  }

  /// `03:42` countdown
  static String mmss(int seconds) {
    final s = seconds < 0 ? 0 : seconds;
    return '${_two(s ~/ 60)}:${_two(s % 60)}';
  }
}
