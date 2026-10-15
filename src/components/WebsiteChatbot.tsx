'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Minimize2,
  Maximize2,
  ArrowRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

const INITIAL_GREETING: ChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  text: 'Hello! 👋 Welcome to **pdfkitfree**. I am your assistant.\n\nAsk me anything about our PDF tools, pricing plans, client-side privacy guarantee, or AI document assistant!',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const SUGGESTED_QUESTIONS = [
  'Are my PDF files safe?',
  'What is the pricing for Pro?',
  'How does AI document chat work?',
  'Which tools are 100% free?',
];

export function WebsiteChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.answer || 'I am here to help! Please check our Tools or Pricing pages for more information.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'Sorry, I had trouble connecting. You can explore all utilities directly on our [/tools](/tools) page or check [/pricing](/pricing).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert markdown links [text](url) and **bold** into clickable and styled elements
  const renderFormattedText = (raw: string) => {
    const parts = raw.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*|\n)/g);

    return parts.map((part, index) => {
      if (!part) return null;

      // Markdown links: [Label](/url)
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        return (
          <Link
            key={index}
            href={href}
            onClick={() => setIsOpen(false)}
            className="font-bold underline text-[#4b49ac] hover:text-[#7978e3] inline-flex items-center gap-0.5 mx-0.5"
          >
            <span>{label}</span>
            <ArrowRight className="h-2.5 w-2.5 inline" />
          </Link>
        );
      }

      // Bold: **Text**
      const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
      if (boldMatch) {
        return <strong key={index} className="font-bold text-slate-900">{boldMatch[1]}</strong>;
      }

      // Line breaks
      if (part === '\n') {
        return <br key={index} />;
      }

      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#4b49ac] text-white shadow-xl hover:bg-[#413e96] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#98dbff]/50"
          aria-label="Open Website Support Assistant"
        >
          <div className="relative">
            <Bot className="h-7 w-7 transition-transform group-hover:rotate-6" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#98dbff] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#f3797e] text-[10px] font-black text-white shadow">
              {unreadCount}
            </span>
          )}

          {/* Tooltip hint on hover */}
          <span className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
            Need help? Ask our Website Assistant 👋
          </span>
        </button>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div
          className={`flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95 ${
            isExpanded
              ? 'fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[650px] sm:w-[460px]'
              : 'h-[530px] w-[92vw] sm:w-[380px]'
          }`}
          role="dialog"
          aria-label="pdfkitfree Support Chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#4b49ac] to-[#7978e3] p-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold leading-tight">pdfkitfree Assistant</h3>
                  <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[9px] font-black text-emerald-200 uppercase">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-200">Instant Website &amp; Tools Guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
                title="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Privacy badge */}
          <div className="bg-[#98dbff]/20 px-3.5 py-1.5 border-b border-[#98dbff]/40 flex items-center justify-between text-[11px] text-slate-700">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#4b49ac]" />
              <span>Zero server upload guarantee</span>
            </span>
            <Link
              href="/privacy"
              onClick={() => setIsOpen(false)}
              className="text-[#4b49ac] font-bold hover:underline"
            >
              Learn more
            </Link>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${
                    isAssistant ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {isAssistant && (
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#4b49ac] text-white text-[10px]">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs leading-relaxed ${
                      isAssistant
                        ? 'border border-slate-200 bg-white text-slate-800'
                        : 'bg-[#4b49ac] text-white rounded-br-none'
                    }`}
                  >
                    <div className="space-y-1">
                      {isAssistant ? (
                        <div>{renderFormattedText(m.text)}</div>
                      ) : (
                        <p>{m.text}</p>
                      )}
                    </div>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isAssistant ? 'text-slate-400' : 'text-white/70'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {!isAssistant && (
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-300 text-slate-700 text-[10px]">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4b49ac] text-white">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4b49ac]" />
                  <span>Assistant is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions when chat is new */}
          {messages.length <= 2 && (
            <div className="border-t border-slate-100 bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#7978e3]" /> Suggested questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 hover:text-[#4b49ac] transition text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-slate-200 bg-white p-3 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about pdfkitfree..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#4b49ac] focus:outline-none focus:ring-2 focus:ring-[#4b49ac]/20 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4b49ac] text-white shadow hover:bg-[#413e96] disabled:opacity-40 transition"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
