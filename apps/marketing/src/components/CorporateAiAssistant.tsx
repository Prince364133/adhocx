import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  showContactCta?: boolean;
}

const getOpenAiKey = (): string => {
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  const encoded = 'c2stcHJvai0wcUFIS1FuWGwtS08xZTRkdmZqcTIzZXJ2d0tIWnZqZnJjZjhXQUloRDZwYWdNangySllmVF8zbm5VUl9sN2dwZEJIZTlBNGdPWVQzQmxia0ZKS0J0d0xSMzVLTzRwR0xBM2d6OW9kalhrQ0lRVU9vdy12QmhqYmY1UkxyT1p3eUR0WEpxT24waWV2YW5wOERNbV9kLWNrejBvQUE=';
  try {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(encoded);
    }
  } catch {
    // fallback
  }
  return '';
};

// Strict, high-performance system prompt tuned for short, engaging, on-brand B2B responses
const SYSTEM_PROMPT = `You are the official Corporate AI Assistant for AdhocX (operated by Estemporaneo Technologies Private Limited), headquartered in Hyderabad, Telangana.
Your primary role is to assist corporate decision-makers (HR Directors, Corporate Transport / ETS Managers, Facilities Administrators, Operations VPs, and Procurement Leads) who are evaluating AdhocX for B2B employee transportation services.

STRICT KNOWLEDGE & SCOPE RULES:
1. EXCLUSIVELY USE ADHOCX WEBSITE DATA: Base all answers directly on AdhocX's official corporate transportation platform, operating models, fleets, mobile apps, and governance rules. You may also draw upon industry knowledge related to B2B travel-tech (e.g. GPS telemetry freshness, dynamic route clustering, geofenced duty slips, ERP 3-way match, SCSC graveyard safety protocols), but ONLY as they directly apply to corporate employee transportation.
2. STRICTLY NO OFF-TOPIC QUERIES: If a user asks about anything unrelated to corporate employee transportation, travel tech, or AdhocX (e.g. general trivia, politics, cooking, coding, medical advice), politely decline and redirect: "I specialize exclusively in AdhocX corporate employee transportation and B2B mobility tech. How may I assist you with your enterprise fleet, employee commute, or corporate routes today?"
3. SHORT & ENGAGING ANSWERS (CRITICAL):
   - Keep answers SHORT, PUNCHY, AND HIGHLY ENGAGING. Never output long essays or walls of text!
   - Maximum length: 2 to 4 concise sentences, or 2 to 3 compact bullet points.
   - Executives and transport managers want direct, immediate facts without unnecessary filler.
4. SUPPORT ASTERISKS FOR BOLD:
   - Use asterisks (**bold text**) to emphasize key technical terms, vehicle models, or compliance standards (e.g. **100% Commercial Yellow-Plate**, **Pre-Scheduled Shift Rosters**, **Direct Bank Settlements**). The UI parser converts them into bold text.
5. STRICT RULE: ZERO emojis in all responses (maintain an executive, enterprise B2B tone).

CORE ADHOCX KNOWLEDGE BASE:
- Direct Contract Model: AdhocX contracts directly with enterprises. Independent commercial cab owners onboard directly. Zero middleman brokers, zero arbitrary commission cuts, and transparent pre-agreed contract rate cards.
- 100% Commercial Yellow-Plate Fleets: 4-seater sedans (Maruti Dzire, Toyota Etios, Hyundai Aura, Tata Tigor EV) and 6/7-seater MUVs/SUVs (Maruti Ertiga, XL6, Kia Carens, Toyota Innova Crysta). Never private white-plate cars.
- Primary Operating Corridors: Hyderabad technology parks and enterprise corridors (HITEC City, Gachibowli, Financial District, Madhapur, Kondapur, Pocharam).
- 5 Specialized Industry Verticals:
  1. IT & Tech Parks: High-density nodal stops, rotational shift rosters, multi-campus connectivity across HITEC City and Gachibowli.
  2. 24/7 BPO & Operations (24/7 Duty Ready): Zero-dropout shift handoffs, Cyberabad Security Council (SCSC) compliance, automated female safe-drop sequence (never drop a female employee first/last alone at night), verified security escorts, 1-tap SOS desk.
  3. GCCs & Consulting: Executive mobility, dedicated premium fleets (Innova Crysta, Hycross, executive sedans), RGIA airport transfers with flight-delay tracking, privacy calling proxy, NDA-bound chauffeurs.
  4. Banking & BFSI: Audit-ready financial governance, automated 3-way match reconciliation (Duty Slip GPS = Fleet Invoiced = Corporate Approved), single consolidated monthly GST invoice, zero billing leakage.
  5. Healthcare & Critical Infrastructure: 24/7 punctual staff transit, rapid driver standby replacements, sanitized vehicles, zero disruption to patient care.
- Technology Suite:
  - Employee Mobile App: Corporate SSO/OTP login, live GPS tracking with age freshness indicator, walking directions to pickup nodes, dynamic 4-digit OTP/QR boarding pass, 1-tap in-transit SOS desk.
  - Driver Mobile App: Paperless 24-business-hour digital onboarding, pre-scheduled advance route offers (zone, time, stop count, distance, payout), ordered stop navigation, OTP boarding scanner, transparent in-app ledger with direct bank settlements.
- Commercial & Pricing Policy: Pricing is customized per enterprise shift schedule, commuter volume, and corridor mileage. Never invent or quote specific numeric rates. Always invite users to request a custom corporate quotation or RFP proposal.`;

/**
 * Text formatting helper that converts **bold** or *bold* asterisks into <strong> elements
 */
function renderFormattedText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold** or *bold*
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const boldText = match[2] || match[3];
    parts.push(
      <strong key={match.index} style={{ fontWeight: 700, color: 'inherit' }}>
        {boldText}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Multi-line message renderer supporting line breaks, bullet points, and bold asterisks
 */
function renderMessage(content: string, isUser: boolean): React.ReactNode {
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // Paragraph spacing for empty lines
    if (!trimmed) {
      return <div key={idx} style={{ height: '6px' }} />;
    }

    // Bullet items: - , * , • or numbered list (1., 2.)
    const bulletMatch = trimmed.match(/^([-*•]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const prefix = bulletMatch[1];
      const text = bulletMatch[2];
      const isOrdered = /^\d+\./.test(prefix);

      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0' }}>
          <span style={{
            color: isUser ? '#ffffff' : 'var(--color-primary-600, #5728B2)',
            fontWeight: 700,
            fontSize: isOrdered ? '0.8rem' : '1rem',
            lineHeight: 1.4,
            flexShrink: 0
          }}>
            {isOrdered ? prefix : '•'}
          </span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>
            {renderFormattedText(text)}
          </span>
        </div>
      );
    }

    // Standard paragraph line
    return (
      <div key={idx} style={{ margin: '2px 0', lineHeight: 1.55 }}>
        {renderFormattedText(line)}
      </div>
    );
  });
}

export default function CorporateAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('adhocx_chat_history');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! I am the **AdhocX Corporate AI Assistant**.\nHow can I assist you with your **enterprise employee transportation**, **commercial fleets**, or **corporate shift routes** today?',
            showContactCta: false
          }
        ]);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save conversation to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem('adhocx_chat_history', JSON.stringify(messages));
      } catch {
        // Ignore storage errors
      }
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getOpenAiKey()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: apiMessages,
          temperature: 0.3,
          max_tokens: 240 // Tuned for short, crisp, engaging executive answers
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content ||
        'Our corporate logistics team is available to assist with your specific inquiry. Please click below to request a tailored proposal.';

      // Determine if a sales/contact CTA should be shown
      const lowerReply = reply.toLowerCase();
      const lowerText = text.toLowerCase();
      const triggersCta =
        lowerReply.includes('proposal') ||
        lowerReply.includes('contact') ||
        lowerReply.includes('sales') ||
        lowerReply.includes('quotation') ||
        lowerText.includes('price') ||
        lowerText.includes('cost') ||
        lowerText.includes('quote') ||
        lowerText.includes('rate') ||
        lowerText.includes('contract') ||
        lowerText.includes('rfp');

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          showContactCta: triggersCta
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I am currently unable to fetch a real-time response. For detailed corporate quotations, shift pilot assessments, or fleet inquiries, our sales team is standing by to assist you.',
          showContactCta: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'What services does AdhocX provide?',
    'How does women night safety work?',
    'What vehicles are in your commercial fleet?',
    'How does the Employee Mobile App work?',
    'How do I request a corporate quotation?'
  ];

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #5728B2 0%, #0948AC 100%)',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '9999px',
            boxShadow: '0 8px 25px rgba(87, 40, 178, 0.45)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.95rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          aria-label="Open AdhocX Corporate AI Assistant"
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span>AdhocX Corporate AI</span>
        </button>
      )}

      {/* Chat Dialog Box */}
      {isOpen && (
        <div style={{
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          height: '560px',
          maxHeight: 'calc(100vh - 80px)',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(1, 13, 45, 0.25)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #010D2D 0%, #0948AC 100%)',
            color: '#ffffff',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  AdhocX Assistant
                </div>
                <div style={{ fontSize: '0.75rem', color: '#CEE0FD', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                  Enterprise Mobility AI
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close Assistant"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Messages Window */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#F8F9FA'
          }}>
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{
                    background: isUser ? '#5728B2' : '#ffffff',
                    color: isUser ? '#ffffff' : '#1e293b',
                    padding: '12px 14px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                    border: isUser ? 'none' : '1px solid #e2e8f0'
                  }}>
                    {renderMessage(m.content, isUser)}
                  </div>

                  {/* Fallback / Contact Sales Action Button */}
                  {m.showContactCta && (
                    <div style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                      <a
                        href="/contact?purpose=quotation"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #5728B2 0%, #3B1780 100%)',
                          color: '#ffffff',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 3px 10px rgba(87, 40, 178, 0.3)'
                        }}
                      >
                        <span>Request Custom Proposal &rarr;</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: '#64748b'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                <span>AdhocX AI is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Pills (if conversation is short) */}
          {messages.length <= 3 && !isLoading && (
            <div style={{
              padding: '8px 14px',
              background: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none'
            }}>
              {quickPrompts.slice(0, 3).map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '4px 10px',
                    fontSize: '0.725rem',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '12px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Ask about corporate transport, apps, or fleets..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              style={{
                background: inputMessage.trim() ? '#5728B2' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 14px',
                cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Send Message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
