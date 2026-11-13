import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 7: Live Support Chat
class LiveSupportChatScreen extends StatefulWidget {
  const LiveSupportChatScreen({super.key});

  @override
  State<LiveSupportChatScreen> createState() => _LiveSupportChatScreenState();
}

class _LiveSupportChatScreenState extends State<LiveSupportChatScreen> {
  final List<Map<String, dynamic>> _messages = [];
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scroll = ScrollController();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    final safety = await MockDataService.getSafetyData();
    if (!mounted) return;
    setState(() {
      _messages.addAll(
        (safety['chat_messages'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>(),
      );
      _isLoading = false;
    });
  }

  /// Keeps the newest message in view (it previously landed off-screen).
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

  void _sendMessage() {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add({'sender': 'user', 'text': text, 'time': 'Just now'});
      _msgController.clear();
    });
    _scrollToEnd();

    // Simulated support response (mock).
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _messages.add({
          'sender': 'support',
          'text':
              'Thank you for reaching out. An AdhocX transport agent is reviewing your message.',
          'time': 'Just now',
        });
      });
      _scrollToEnd();
    });
  }

  @override
  void dispose() {
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
                    child: ListView.builder(
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
                              color: isUser ? AppColors.primary : p.surface,
                              border: isUser ? null : Border.all(color: p.border),
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(AppRadius.xxl),
                                topRight: const Radius.circular(AppRadius.xxl),
                                bottomLeft: Radius.circular(
                                    isUser ? AppRadius.xxl : AppRadius.xs),
                                bottomRight: Radius.circular(
                                    isUser ? AppRadius.xs : AppRadius.xxl),
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
                                    color: isUser ? Colors.white : p.textPrimary,
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
                        // Attachments aren't implemented yet: shown disabled
                        // instead of as a dead tap target.
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
                          onPressed: _sendMessage,
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
