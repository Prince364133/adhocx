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

const SYSTEM_PROMPT = `You are the official AI Corporate Assistant for AdhocX, operated by Estemporaneo Technologies Private Limited, headquartered in Hyderabad, Telangana.
Your primary role is to assist corporate decision-makers (HR heads, Corporate Transport Managers, Facilities Admins, VP Operations, and Procurement) who are evaluating AdhocX for employee transportation services (ETS).

Key Company & Platform Knowledge:
1. Business Model: AdhocX contracts directly with corporate clients to plan and operate enterprise transportation. Drivers are independent commercial cab owners onboarded directly with yellow-plate cabs. There is NO vendor intermediary or middleman broker in our enterprise flow.
2. Fleets: 100% yellow-plate commercial passenger vehicles. 4-seater sedans (Maruti Dzire, Toyota Etios, Tata Tigor EV) and 6/7-seater MUVs (Maruti Ertiga, XL6, Kia Carens, Toyota Innova Crysta).
3. Operating Corridors: Hyderabad technology parks and enterprise hubs (HITEC City, Gachibowli, Financial District, Madhapur, Kondapur, Pocharam).
4. Employee Mobile App: Corporate SSO & OTP authentication, live cab GPS tracking with age freshness indicator, walking directions to pickup spots, dynamic expiring OTP/QR boarding verification, 1-tap in-transit SOS emergency button connected to our 24/7 safety command desk, shift calendar view, and commuter feedback.
5. Driver Partner App: Direct digital onboarding (KYC, commercial driving license, RC, passenger insurance, RTA fitness), transparent advance route offers, turn-by-turn navigation, boarding OTP scanner, and direct bank settlements on verified trip completion.
6. Safety & Compliance: 24/7 safety command centre oversight, strict night-shift escort policies, female safe-drop sequencing (never leaving female employees as the first pickup or last drop alone at night), geofenced speed and deviation alarms.
7. Industries Served: IT & ITES campuses, 24/7 BPO/KPO operations, Global Capability Centers (GCCs), Banking & Financial Services (BFSI), and Healthcare facilities.
8. Pricing & Commercial Policy: AdhocX provides customized corporate contracts, monthly shift packages, and mileage-based rate cards tailored to each enterprise's specific shift schedules, headcount, and route density. You must NEVER invent or quote specific numeric prices, rates, or guarantees. Always explain that pricing is customized and guide the user to request a tailored corporate proposal.
9. If a user asks a question you cannot answer with certainty, or asks for specific quotations, pricing, or contract finalization, politely inform them that our corporate sales team will provide an exact quotation and invite them to use the "Request Corporate Proposal" button.

Style & Tone Guidelines:
- Highly professional, courteous, clear, and enterprise B2B friendly.
- STRICT RULE: ZERO emojis in all messages.
- Keep answers concise, direct, and structured with clean bullet points.`;

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
            content: 'Hello. I am the AdhocX Corporate AI Assistant. How can I assist you with your enterprise employee transportation, mobile apps, or fleet requirements today?',
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
          max_tokens: 450
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
        lowerText.includes('contract');

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
            background: 'linear-gradient(135deg, #1167EE 0%, #0948AC 100%)',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '9999px',
            boxShadow: '0 8px 25px rgba(17, 103, 238, 0.45)',
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
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{
                    background: isUser ? '#1167EE' : '#ffffff',
                    color: isUser ? '#ffffff' : '#1e293b',
                    padding: '12px 14px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.content}
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
                background: inputMessage.trim() ? '#1167EE' : '#94a3b8',
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

