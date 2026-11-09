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

// Human-centric, consultative system prompt tuned for short, conversational B2B responses
const SYSTEM_PROMPT = `You are a warm, helpful, and consultative Human Corporate Mobility Advisor representing AdhocX (operated by Estemporaneo Technologies Private Limited, Hyderabad).
You are having a live back-and-forth conversation with corporate decision-makers (HR Directors, Corporate Transport / ETS Managers, Admin Heads, Facilities Leads, Operations VPs) who are exploring employee transportation services for their company.

CONVERSATIONAL PERSONA & TONE:
1. TALK LIKE A REAL HUMAN CONSULTANT:
   - Always sound like a warm, supportive, knowledgeable human mobility partner ("I'd be glad to help with that!", "We work closely with IT and BPO firms in Hyderabad...", "I can help you arrange a pilot route for your team...").
   - Vary your opening naturally. DO NOT use canned repetitive phrases like "I appreciate your interest" or "Thank you for reaching out". Speak naturally, directly, and with genuine warmth.
   - NEVER sound like a robotic encyclopedia, search engine, or regurgitator. NEVER output massive numbered lists, textbook definitions, or walls of text.
2. STRICT LENGTH LIMIT — KEEP IT SHORT & BITE-SIZED:
   - Every response MUST be strictly 2 to 3 concise, punchy sentences (under 55 words total).
   - If using bullet points, use at most 2 brief bullet points.
   - The user is chatting on a compact widget. Short, back-and-forth dialogue keeps the user engaged without scrolling.
3. CONVERSATIONAL DISCOVERY & PROACTIVE GUIDANCE (ALWAYS LEAD TO ACTION):
   - Answer their specific question crisply first.
   - Proactively guide them towards trying our services (e.g., offer a **risk-free 1-week pilot route** or a free route-cost assessment for their campus).
   - Always end with an engaging discovery question about their company (e.g., asking about their office location in Hyderabad like HITEC City or Gachibowli, their shift timings, or employee headcount) so they can explore which service fits them best.
4. COMPLETE ADHOCX CONSCIOUSNESS & WEBSITE FACTS:
   - Direct Contract Model: Direct corporate enterprise agreements and direct commercial driver onboarding. Zero middleman brokers, zero hidden markups, transparent pre-agreed rate cards.
   - 100% Commercial Yellow-Plate Fleet: 4-seater sedans (Maruti Dzire, Toyota Etios, Tata Tigor EV, Hyundai Aura) and 6/7-seater MUVs (Maruti Ertiga, XL6, Toyota Innova Crysta, Kia Carens). Strictly commercial yellow-board vehicles with calibrated speed governors (80 km/h) and real-time GPS tracking. Never private white-plate cars.
   - Primary Operating Corridors: Hyderabad technology hubs (HITEC City, Gachibowli, Financial District, Madhapur, Kondapur, Pocharam, Uppal, Begumpet, Shamshabad RGIA).
   - Core Services:
     * Scheduled Shift Commutes: Clustered nodal routing for morning logins & evening logouts.
     * 24/7 BPO & Operations Transit: Standby backup cabs, zero-dropout shift handoffs.
     * Women Night Safety (SCSC Compliance): Telangana Transport & Cyberabad Security Council compliant; automated safe-drop sequences (female employees are never dropped first or last alone between 8 PM and 6 AM), verified security escorts, 1-tap SOS panic desk.
     * Executive Mobility & Airport Transfers: Premium fleet with live flight-delay tracking and privacy calling proxy.
     * Adhoc & Event Mobility: Spot corporate cabs for delegator campus visits, offsites, and client visits.
   - Technology Suite (AdhocX ETS):
     * Corporate Client Portal: PostGIS automated route clustering, live command center, audit-ready 3-way match billing (Duty Slip GPS = Invoiced KM = Corporate Approved Roster), single consolidated monthly GST tax invoice.
     * Employee Mobile App: Sub-second live GPS tracking with age freshness indicator, walking directions to nodal pickup, dynamic 4-digit OTP/QR boarding pass, 1-tap in-transit SOS panic desk.
     * Driver Mobile App: Advance shift offers with route preview, GPS navigation with ordered stops, digital duty slips, guaranteed weekly direct bank settlements.
   - Trial / Pilot Offer: Companies can test AdhocX with a risk-free 1-week pilot route or shift assessment before committing to a contract.
   - Pricing: Tailored to corridor mileage, shift schedules, and vehicle category. Never invent numeric rupee rates; invite them to request a tailored route simulation or pilot.
5. FORMATTING & SCOPE:
   - Use markdown asterisks for **bold text** on 1 or 2 key highlights (e.g. **1-week pilot route**, **100% commercial yellow-plate**, **safe-drop protocol**).
   - Only answer queries related to employee transit, fleets, safety, and AdhocX corporate mobility. Politely decline off-topic queries with a human touch.`;

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

  const STORAGE_KEY = 'adhocx_chat_history_v3';

  // Load conversation from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([
          {
            role: 'assistant',
            content: 'Hi there! I am your **AdhocX Corporate Mobility Advisor**.\n\nWe help companies across Hyderabad run reliable, safe employee commutes with 100% commercial yellow-plate fleets.\n\nWould you like to explore commute services for your company or try a **risk-free 1-week pilot route**?',
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
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
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
          temperature: 0.35,
          max_tokens: 180 // Tuned for crisp, conversational 2-3 sentence executive replies
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content ||
        'Our corporate mobility team is ready to assist your company. Please feel free to request a 1-week pilot route or tailored quotation below.';

      // Determine if a sales/pilot CTA should be shown
      const lowerReply = reply.toLowerCase();
      const lowerText = text.toLowerCase();
      const triggersCta =
        lowerReply.includes('pilot') ||
        lowerReply.includes('proposal') ||
        lowerReply.includes('contact') ||
        lowerReply.includes('sales') ||
        lowerReply.includes('quotation') ||
        lowerReply.includes('simulation') ||
        lowerReply.includes('assessment') ||
        lowerText.includes('pilot') ||
        lowerText.includes('try') ||
        lowerText.includes('trial') ||
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
          content: 'I apologize for the brief pause! For immediate corporate quotations, 1-week pilot route assessments, or fleet inquiries, our mobility desk is on standby to help your team.',
          showContactCta: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Can our company try a 1-week pilot?',
    'What commute services do you provide?',
    'How does women night safety work?',
    'What vehicles are in your commercial fleet?',
    'How do I request a corporate rate card?'
  ];

  return (
    <div className="corporate-ai-root">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)',
            color: '#ffffff',
            padding: '13px 20px',
            borderRadius: '9999px',
            boxShadow: '0 8px 25px rgba(87, 40, 178, 0.45)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.95rem',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          aria-label="Open AdhocX Mobility Advisor"
          className="brand-logo"
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: '#ffffff' }}>Adhoc</span>
            <span style={{ color: '#FF5F09' }}>X</span>
            <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', marginLeft: '5px' }}>Advisor</span>
          </span>
        </button>
      )}

      {/* Chat Dialog Box */}
      {isOpen && (
        <div className="corporate-ai-dialog" style={{
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
            background: 'linear-gradient(135deg, #1B0E38 0%, #2D145E 100%)',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5728B2 0%, #FF5F09 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '2px solid #1B0E38'
                }}></span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#ffffff' }}>Adhoc</span>
                  <span style={{ color: '#FF5F09' }}>X</span>
                  <span style={{ color: '#ffffff', marginLeft: '5px' }}>Mobility Advisor</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#CEE0FD', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                  Online • Corporate Commute Specialist
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

                  {/* Fallback / Pilot & Contact Action Buttons */}
                  {m.showContactCta && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <a
                          href="/contact?purpose=pilot"
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
                          <span>Try 1-Week Pilot Route &rarr;</span>
                        </a>
                        <a
                          href="tel:+917893545818"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
                            color: '#5728B2',
                            border: '1px solid #cbd5e1',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          <span>Call Helpline</span>
                        </a>
                      </div>
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
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5728B2', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span>Adhoc</span><span style={{ color: '#FF5F09', fontWeight: 700 }}>X</span><span style={{ marginLeft: '4px' }}>Advisor is typing...</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Pills (if conversation is short) */}
          {messages.length <= 4 && !isLoading && (
            <div style={{
              padding: '8px 14px',
              background: '#ffffff',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'thin'
            }}>
              {quickPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
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
              placeholder="Ask about pilot routes, fleets, or commute services..."
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
