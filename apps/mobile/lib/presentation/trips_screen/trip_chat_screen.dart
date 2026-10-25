import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/user_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_profile_avatar.dart';

/// Full-featured Trip Chat Screen connecting Driver and Vendor/User for an active trip.
class TripChatScreen extends StatefulWidget {
  final dynamic params;

  const TripChatScreen({super.key, this.params});

  @override
  State<TripChatScreen> createState() => _TripChatScreenState();
}

class _TripChatScreenState extends State<TripChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  Timer? _pollingTimer;
  bool _isLoading = true;
  bool _isSending = false;

  String _tripId = '';
  String _otherPartyName = 'User';
  String _otherPartyPhone = '';
  String? _otherPartyPhoto;
  String _myUserId = '';
  bool _isDriver = true;

  @override
  void initState() {
    super.initState();
    _initParams();
    _fetchMessages();
    // Poll for new messages every 3 seconds while chat is active
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted) _fetchMessages(silent: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _initParams() {
    final user = AuthService.instance.currentUser;
    _myUserId = user?.id ?? '';
    _isDriver = user?.role.toUpperCase() != 'VENDOR';

    if (widget.params is Map) {
      final p = widget.params as Map<String, dynamic>;
      _tripId = p['tripId']?.toString() ?? p['id']?.toString() ?? '';
      _otherPartyName = p['otherPartyName']?.toString() ??
          p['vendorName']?.toString() ??
          p['driverName']?.toString() ??
          (_isDriver ? 'User' : 'Driver');
      _otherPartyPhone = p['otherPartyPhone']?.toString() ??
          p['vendorPhone']?.toString() ??
          p['driverPhone']?.toString() ??
          '';
      _otherPartyPhoto = p['otherPartyPhoto']?.toString() ??
          p['vendorPhoto']?.toString() ??
          p['driverPhoto']?.toString() ??
          p['photoUrl']?.toString() ??
          p['profilePhotoUrl']?.toString() ??
          p['avatarUrl']?.toString();
    } else if (widget.params is String) {
      _tripId = widget.params as String;
    }
  }

  Future<void> _fetchMessages({bool silent = false}) async {
    if (_tripId.isEmpty) return;

    if (!silent) setState(() => _isLoading = true);
    try {
      List<dynamic> raw = [];
      if (_isDriver) {
        raw = await DriverService.instance.getTripMessages(_tripId);
      } else {
        raw = await UserService.instance.getTripMessages(_tripId);
      }

      if (mounted) {
        final List<Map<String, dynamic>> fetched = [];
        for (final item in raw) {
          if (item is Map) {
            fetched.add(Map<String, dynamic>.from(item));
          }
        }

        final prevCount = _messages.length;
        setState(() {
          _messages.clear();
          _messages.addAll(fetched);
          _isLoading = false;
        });

        // Auto-scroll to bottom if new messages arrived
        if (_messages.length > prevCount) {
          _scrollToBottom();
        }
      }
    } catch (_) {
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? quickText]) async {
    final text = (quickText ?? _messageController.text).trim();
    if (text.isEmpty || _isSending) return;

    if (quickText == null) {
      _messageController.clear();
    }

    setState(() => _isSending = true);

    // Optimistically add to list
    final tempMsg = {
      'id': 'temp_${DateTime.now().millisecondsSinceEpoch}',
      'tripId': _tripId,
      'senderId': _myUserId,
      'senderName': _isDriver ? 'Driver' : 'User',
      'senderRole': _isDriver ? 'DRIVER' : 'VENDOR',
      'text': text,
      'createdAt': DateTime.now().toIso8601String(),
    };

    setState(() {
      _messages.add(tempMsg);
    });
    _scrollToBottom();

    try {
      if (_isDriver) {
        await DriverService.instance.sendTripMessage(_tripId, text);
      } else {
        await UserService.instance.sendTripMessage(_tripId, text);
      }
      await _fetchMessages(silent: true);
    } catch (e) {
      Fluttertoast.showToast(msg: 'Failed to deliver message');
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _makeCall() async {
    final phone = _otherPartyPhone.replaceAll(RegExp(r'[^\d+]'), '');
    if (phone.isEmpty) {
      Fluttertoast.showToast(msg: 'Contact number not available');
      return;
    }

    final uri = Uri.parse('tel:$phone');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Unable to open dialer');
    }
  }

  List<String> get _quickReplies {
    if (_isDriver) {
      return [
        'I have arrived at pickup location',
        'Stuck in traffic (~10 mins delay)',
        'Waiting at the main entrance gate',
        'Please share trip start OTP when ready',
        'Starting the trip now',
      ];
    } else {
      return [
        'Driver on the way?',
        'Waiting at the office porch',
        'Security clearance verified at gate',
        'Passenger is walking down now',
        'Thank you!',
      ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final shortId = _tripId.length > 8 ? _tripId.substring(0, 8).toUpperCase() : _tripId.toUpperCase();
    final headerRoleLabel = _isDriver ? 'User' : 'Driver';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            // ── Top Navigation Bar ──────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: Icon(
                      Icons.arrow_back,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  AppProfileAvatar(
                    radius: 20,
                    imageUrl: _otherPartyPhoto,
                    name: _otherPartyName,
                    isDark: isDark,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$headerRoleLabel: $_otherPartyName',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: AppColors.accentGreenDark,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Trip #$shortId',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: _makeCall,
                    tooltip: 'Call $headerRoleLabel',
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.phone_rounded,
                        size: 20,
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Messages Stream ─────────────────────────────────────────────
            Expanded(
              child: _isLoading && _messages.isEmpty
                  ? Center(
                      child: CircularProgressIndicator(
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                      ),
                    )
                  : _messages.isEmpty
                      ? _buildEmptyState(isDark)
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                            vertical: AppSpacing.lg,
                          ),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isMe = msg['senderId'] == _myUserId ||
                                (_isDriver && msg['senderRole'] == 'DRIVER') ||
                                (!_isDriver && msg['senderRole'] == 'VENDOR');

                            return _buildMessageBubble(msg, isMe, isDark);
                          },
                        ),
            ),

            // ── Quick Replies Row ───────────────────────────────────────────
            Container(
              height: 44,
              padding: const EdgeInsets.symmetric(vertical: 4),
              color: isDark ? AppColors.surfaceDark.withValues(alpha: 0.6) : AppColors.borderLight.withValues(alpha: 0.4),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                itemCount: _quickReplies.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final reply = _quickReplies[index];
                  return ActionChip(
                    label: Text(
                      reply,
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    backgroundColor: isDark ? AppColors.surfaceElevatedDark : Colors.white,
                    side: BorderSide(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    onPressed: () => _sendMessage(reply),
                  );
                },
              ),
            ),

            // ── Message Composer ────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                      child: TextField(
                        controller: _messageController,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                        style: AppTypography.body(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Type message to ${_isDriver ? 'user' : 'driver'}...',
                          hintStyle: AppTypography.body(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _isSending ? null : () => _sendMessage(),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            isDark ? AppColors.primaryLight : AppColors.primary,
                            AppColors.primaryDark,
                          ],
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: _isSending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(
                                Icons.send_rounded,
                                size: 20,
                                color: Colors.white,
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, bool isMe, bool isDark) {
    final text = msg['text']?.toString() ?? '';
    final createdAt = msg['createdAt'] != null
        ? DateTime.tryParse(msg['createdAt'].toString())?.toLocal()
        : null;

    final timeStr = createdAt != null
        ? '${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}'
        : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            AppProfileAvatar(
              radius: 14,
              imageUrl: _otherPartyPhoto,
              name: _otherPartyName,
              isDark: isDark,
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                gradient: isMe
                    ? LinearGradient(
                        colors: [
                          isDark ? AppColors.primaryLight : AppColors.primary,
                          AppColors.primaryDark,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                color: isMe
                    ? null
                    : (isDark ? AppColors.surfaceElevatedDark : Colors.white),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
                border: isMe
                    ? null
                    : Border.all(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isMe ? 0.12 : 0.04),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Text(
                    text,
                    style: AppTypography.body(
                      color: isMe
                          ? Colors.white
                          : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        timeStr,
                        style: TextStyle(
                          fontSize: 10,
                          color: isMe
                              ? Colors.white.withValues(alpha: 0.75)
                              : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        ),
                      ),
                      if (isMe) ...[
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.done_all_rounded,
                          size: 13,
                          color: Colors.white70,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.chat_outlined,
                size: 36,
                color: isDark ? AppColors.primaryLight : AppColors.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Trip Chat Active',
              style: AppTypography.h4(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Connect directly with ${_isDriver ? 'the booking user' : 'your driver'} regarding pickup location, traffic, or timing.',
              textAlign: TextAlign.center,
              style: AppTypography.caption(
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
