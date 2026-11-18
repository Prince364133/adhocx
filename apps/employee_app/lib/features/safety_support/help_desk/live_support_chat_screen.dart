import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Live Support Chat wired to GET/POST /corporate/support/tickets/:id/messages.
class LiveSupportChatScreen extends StatefulWidget {
  const LiveSupportChatScreen({super.key});

  @override
  State<LiveSupportChatScreen> createState() => _LiveSupportChatScreenState();
}

class _LiveSupportChatScreenState extends State<LiveSupportChatScreen> {
  final List<Map<String, dynamic>> _messages = [];
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scroll = ScrollController();
  Timer? _pollTimer;
  bool _isLoading = true;
  bool _refreshing = false;
  bool _sending = false;
  String? _ticketId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadMessages());
  }

  void _startPolling() {
    _pollTimer?.cancel();
    if (_ticketId == null || _ticketId!.isEmpty) return;
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _refreshMessages(silent: true);
    });
  }

  Future<void> _loadMessages() async {
    String? ticketId;
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is String && extra.isNotEmpty) {
        ticketId = extra;
      } else if (extra is Map && extra['id'] != null) {
        ticketId = extra['id'].toString();
      }
    } catch (_) {}

    final data = maybeEmployeeData(context);
    if (data != null) {
      if (ticketId == null || ticketId.isEmpty) {
        final tickets = await data.loadTickets();
        if (tickets.isNotEmpty) {
          ticketId = tickets.first['id']?.toString();
        }
      }
      if (ticketId != null && ticketId.isNotEmpty) {
        try {
          final rawMessages = await data.repository.getTicketMessages(ticketId);
          _messages
            ..clear()
            ..addAll(rawMessages
                .whereType<Map>()
                .map((m) => _normalizeMessage(Map<String, dynamic>.from(m))));
        } catch (_) {}
      }
    }

    if (!mounted) return;
    setState(() {
      _ticketId = ticketId;
      _isLoading = false;
    });
    _startPolling();
    _scrollToEnd();
  }

  Future<void> _refreshMessages({bool silent = false}) async {
    final data = maybeEmployeeData(context);
    final ticketId = _ticketId;
    if (data == null || ticketId == null || ticketId.isEmpty || _refreshing) {
      return;
    }
    if (!silent && mounted) {
      setState(() => _refreshing = true);
    } else {
      _refreshing = true;
    }
    try {
      final rawMessages = await data.repository.getTicketMessages(ticketId);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(rawMessages
              .whereType<Map>()
              .map((m) => _normalizeMessage(Map<String, dynamic>.from(m))));
      });
    } catch (_) {
      // Preserve existing messages if refresh fails.
    } finally {
      _refreshing = false;
      if (mounted && !silent) setState(() {});
    }
  }

  Map<String, dynamic> _normalizeMessage(Map<String, dynamic> raw) {
    final senderRole = (raw['senderRole'] ?? raw['authorRole'] ?? '').toString().toUpperCase();
    final isUser = senderRole == 'EMPLOYEE' || raw['sender'] == 'user';
    final text = raw['message']?.toString() ?? raw['body']?.toString() ?? raw['text']?.toString() ?? '';
    final time = EmployeeDataProvider.formatDisplayTime(
      raw['createdAt']?.toString() ?? raw['time']?.toString(),
    );
    return {
      'sender': isUser ? 'user' : 'support',
      'text': text,
      'time': time.isNotEmpty ? time : 'Just now',
    };
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty || _sending) return;

    final data = maybeEmployeeData(context);
    setState(() {
      _sending = true;
      _messages.add({'sender': 'user', 'text': text, 'time': 'Sending…'});
      _msgController.clear();
    });
    _scrollToEnd();

    try {
      if (data != null) {
        var ticketId = _ticketId;
        if (ticketId == null || ticketId.isEmpty) {
          final created = await data.repository.createTicket(
            category: 'GENERAL_SUPPORT',
            subject: 'Live Support Chat',
            description: text,
          );
          ticketId = created['id']?.toString();
          _ticketId = ticketId;
          if (ticketId != null && ticketId.isNotEmpty) {
            await data.repository.sendTicketMessage(ticketId, text);
            _startPolling();
          }
          await data.loadTickets(force: true);
        } else {
          await data.repository.sendTicketMessage(ticketId, text);
        }
        if (ticketId != null && ticketId.isNotEmpty) {
          final refreshed = await data.repository.getTicketMessages(ticketId);
          if (mounted && refreshed.isNotEmpty) {
            setState(() {
              _messages
                ..clear()
                ..addAll(refreshed
                    .whereType<Map>()
                    .map((m) => _normalizeMessage(Map<String, dynamic>.from(m))));
            });
          } else if (mounted) {
            setState(() {
              _messages.last['time'] = 'Just now';
            });
          }
        }
      } else if (mounted) {
        setState(() {
          _messages.last['time'] = 'Just now';
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to send message: ${e.toString().replaceFirst('Exception: ', '')}',
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToEnd();
      }
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _msgController.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: EmployeeAppBar(
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: 'Refresh messages',
            icon: _refreshing
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: p.accent,
                    ),
                  )
                : Icon(Icons.refresh_rounded, color: p.textPrimary),
            onPressed: _refreshing ? null : () => _refreshMessages(),
          ),
        ],
        titleWidget: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: p.accentTint,
              child: Icon(Icons.headset_mic_rounded, size: 18, color: p.accent),
            ),
            const SizedBox(width: AppSpacing.sm + 2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'AdhocX Support',
                    style: AppTypography.h4(
                      color: p.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    "We're here to help you",
                    style: AppTypography.micro(color: p.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: p.accent))
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: _messages.isEmpty
                        ? const EmployeeEmptyState(
                            icon: Icons.chat_bubble_outline_rounded,
                            title: 'Start a conversation',
                            description:
                                'Send a message below to connect with the AdhocX corporate transport desk.',
                          )
                        : ListView.builder(
                            controller: _scroll,
                            padding: const EdgeInsets.all(AppSpacing.xl),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final msg = _messages[index];
                              final isUser = msg['sender'] == 'user';
                              return Align(
                                alignment: isUser
                                    ? Alignment.centerRight
                                    : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.only(
                                    bottom: AppSpacing.md + 2,
                                  ),
                                  constraints: BoxConstraints(
                                    maxWidth:
                                        MediaQuery.sizeOf(context).width * 0.75,
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: AppSpacing.lg,
                                    vertical: AppSpacing.md,
                                  ),
                                  decoration: BoxDecoration(
                                    color:
                                        isUser ? AppColors.primary : p.surface,
                                    border: isUser
                                        ? null
                                        : Border.all(color: p.border),
                                    borderRadius: BorderRadius.only(
                                      topLeft:
                                          const Radius.circular(AppRadius.xxl),
                                      topRight:
                                          const Radius.circular(AppRadius.xxl),
                                      bottomLeft: Radius.circular(isUser
                                          ? AppRadius.xxl
                                          : AppRadius.xs),
                                      bottomRight: Radius.circular(isUser
                                          ? AppRadius.xs
                                          : AppRadius.xxl),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: isUser
                                        ? CrossAxisAlignment.end
                                        : CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${msg['text'] ?? ''}',
                                        style: AppTypography.body(
                                          color: isUser
                                              ? Colors.white
                                              : p.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: AppSpacing.xs),
                                      Text(
                                        '${msg['time'] ?? ''}',
                                        style: AppTypography.micro(
                                          fontSize: 10,
                                          color: isUser
                                              ? Colors.white.withAlpha(179)
                                              : p.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.sm + 2,
                    ),
                    decoration: BoxDecoration(
                      color: p.surface,
                      border: Border(top: BorderSide(color: p.border)),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          tooltip: 'Attachments (coming soon)',
                          icon: Icon(Icons.attach_file_rounded,
                              color: p.textMuted),
                          onPressed: null,
                        ),
                        Expanded(
                          child: TextField(
                            controller: _msgController,
                            textInputAction: TextInputAction.send,
                            textCapitalization: TextCapitalization.sentences,
                            onSubmitted: (_) => _sendMessage(),
                            style: AppTypography.body(color: p.textPrimary),
                            cursorColor: p.accent,
                            decoration: InputDecoration(
                              hintText: 'Type a message...',
                              hintStyle: AppTypography.body(color: p.textMuted),
                              filled: true,
                              fillColor: p.surfaceElevated,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.lg,
                                vertical: AppSpacing.sm + 2,
                              ),
                              border: OutlineInputBorder(
                                borderRadius: AppRadius.borderPill,
                                borderSide: BorderSide.none,
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: AppRadius.borderPill,
                                borderSide: BorderSide.none,
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: AppRadius.borderPill,
                                borderSide:
                                    BorderSide(color: p.accent, width: 1.5),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        IconButton.filled(
                          tooltip: 'Send',
                          onPressed: _sending ? null : _sendMessage,
                          style: IconButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          icon: const Icon(Icons.send_rounded, size: 18),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
