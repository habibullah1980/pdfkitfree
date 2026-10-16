'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  Upload,
  Send,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  FileQuestion,
  FileCheck2,
  Columns,
} from 'lucide-react';

interface Citation {
  pageNumber?: number;
  sectionTitle?: string;
  excerptSnippet: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: string;
}

interface ConversationItem {
  id: string;
  title: string;
  fileName?: string;
  updatedAt: string;
  messages: Message[];
}

export default function AiAssistantPage() {
  const { user: _user, isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Uploaded document in-browser memory
  const [docFile, setDocFile] = useState<{
    name: string;
    size: number;
    text: string;
    pageCount: number;
  } | null>(null);

  // Compare second document
  const [docFile2, setDocFile2] = useState<{
    name: string;
    text: string;
  } | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [userCredits, setUserCredits] = useState({ used: 0, limit: 50 });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInput2Ref = useRef<HTMLInputElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing conversations on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Ignored if offline
    }
  };

  const handleSelectConversation = (conv: ConversationItem) => {
    setCurrentConvId(conv.id);
    setMessages(conv.messages || []);
    if (conv.fileName) {
      setDocFile({
        name: conv.fileName,
        size: 0,
        text: 'Document context loaded from conversation session.',
        pageCount: 1,
      });
    }
  };

  const handleStartNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setDocFile(null);
    setDocFile2(null);
    setCompareMode(false);
    setError(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations?id=${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvId === id) {
        handleStartNewChat();
      }
    } catch {
      setError('Failed to delete conversation.');
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm('Are you sure you want to delete all AI chat history? This cannot be undone.')) return;
    try {
      await fetch('/api/ai/conversations?all=true', { method: 'DELETE' });
      setConversations([]);
      handleStartNewChat();
    } catch {
      setError('Failed to clear history.');
    }
  };

  // Client-side PDF text extraction
  const handlePdfUpload = async (file: File, isSecond = false) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.');
      return;
    }

    setUploadingPdf(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Dynamically load pdfjs in browser
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let extractedFullText = '';
      const numPages = pdf.numPages;

      for (let i = 1; i <= Math.min(numPages, 30); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items
          .map((item) => ('str' in item ? (item as { str: string }).str : ''))
          .join(' ');
        extractedFullText += `\n[--- Page ${i} ---]\n` + pageStr;
      }

      if (isSecond) {
        setDocFile2({
          name: file.name,
          text: extractedFullText,
        });
      } else {
        setDocFile({
          name: file.name,
          size: file.size,
          text: extractedFullText,
          pageCount: numPages,
        });

        // Add system message welcoming user to the document
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'assistant',
            content: `📄 **${file.name}** (${numPages} pages) has been parsed locally in browser RAM with zero external server upload.\n\nYou can now ask questions, request an executive summary, extract key dates & amounts, or simplify complex clauses.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (_err: unknown) {
      setError('Failed to parse PDF text. Document may be encrypted or image-only scanned.');
    } finally {
      setUploadingPdf(false);
    }
  };

  // Submit a query or structured prompt
  const handleSendMessage = async (customPrompt?: string, taskType: 'qa' | 'summarize' | 'clauses' | 'extract' | 'compare' = 'qa') => {
    const textToSend = customPrompt || inputQuery;
    if (!textToSend.trim() && !docFile) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuery('');
    setLoading(true);
    setError(null);

    try {
      let combinedDocText = docFile?.text || '';
      if (compareMode && docFile2) {
        combinedDocText = `[DOCUMENT 1: ${docFile?.name}]\n${docFile?.text}\n\n[DOCUMENT 2: ${docFile2.name}]\n${docFile2.text}`;
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConvId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          documentText: combinedDocText,
          fileName: docFile?.name,
          totalPages: docFile?.pageCount,
          taskType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI generation failed.');
      }

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.conversation?.id) {
        setCurrentConvId(data.conversation.id);
        loadConversations();
      }
      if (data.creditsUsed !== undefined) {
        setUserCredits({ used: data.creditsUsed, limit: data.creditsLimit || 50 });
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Export current chat as text or print to PDF
  const handleExportSummary = () => {
    const textContent = messages
      .map((m) => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleTimeString()}]\n${m.content}\n\n`)
      .join('---\n\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdfkitfree-AI-Summary-${docFile?.name || 'Conversation'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4b49ac] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              AI Document Assistant
            </h1>
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Private, document-grounded intelligence. Summarize contracts, explain clauses in plain language, or compare two PDFs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>Zero-Retention In-Browser Processing</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleExportSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Summary</span>
            </button>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="my-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Guest mode:</strong> You can test the AI Assistant in sandbox mode. To preserve conversation history and unlock higher monthly limits, sign in.
            </span>
          </div>
          <Link
            href="/login?returnUrl=/ai"
            className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Main Grid: Sidebar & Chat Window */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[650px]">
        {/* Left Column: History & Upload Actions */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="space-y-4">
            <button
              onClick={handleStartNewChat}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4b49ac] py-2.5 px-4 text-xs font-bold text-white shadow-sm hover:bg-[#413e96] transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>New Document Chat</span>
            </button>

            {/* Document upload box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Target PDF Document
              </span>

              {docFile ? (
                <div className="p-2.5 rounded-xl bg-[#4b49ac]/10 border border-[#4b49ac]/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#4b49ac] truncate max-w-[170px]">
                      {docFile.name}
                    </p>
                    <button
                      onClick={() => setDocFile(null)}
                      className="text-slate-400 hover:text-red-500 text-xs"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {docFile.pageCount} pages • {(docFile.size / 1024).toFixed(0)} KB parsed
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPdf}
                    className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-[#4b49ac] hover:bg-[#4b49ac]/5 transition cursor-pointer text-center"
                  >
                    {uploadingPdf ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#4b49ac]" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Select PDF File</span>
                        <span className="text-[10px] text-slate-400">Parsed client-side in RAM</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Compare toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Compare 2 Files</span>
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="rounded accent-[#4b49ac]"
                />
              </div>

              {compareMode && (
                <div className="pt-2">
                  <input
                    type="file"
                    ref={fileInput2Ref}
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handlePdfUpload(e.target.files[0], true);
                    }}
                  />
                  {docFile2 ? (
                    <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 flex justify-between items-center">
                      <span className="truncate max-w-[160px] font-semibold">{docFile2.name}</span>
                      <button onClick={() => setDocFile2(null)} className="text-teal-600">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInput2Ref.current?.click()}
                      className="w-full py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      + Upload Comparison PDF
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Conversation History List */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Chat History
                </span>
                {conversations.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition ${
                      currentConvId === c.id
                        ? 'bg-white border border-[#4b49ac] font-bold text-[#4b49ac] shadow-sm'
                        : 'hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{c.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <p className="text-[11px] text-slate-400 p-2 text-center">No saved chats yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Quota indicator */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Plan AI Credits:</span>
              <span className="font-bold text-slate-800">
                {userCredits.used} / {userCredits.limit}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#4b49ac] h-full rounded-full transition-all"
                style={{ width: `${Math.min((userCredits.used / userCredits.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Chat Window & Action Triggers */}
        <div className="lg:col-span-3 flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Quick Action Chips */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">One-Click Actions:</span>
            <button
              onClick={() => handleSendMessage('Please provide a comprehensive executive summary of this document.', 'summarize')}
              disabled={loading || !docFile}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 hover:bg-[#4b49ac]/10 hover:text-[#4b49ac] transition disabled:opacity-50"
            >
              <FileCheck2 className="h-3 w-3 text-[#4b49ac]" />
              <span>Summarize</span>
            </button>
            <button
              onClick={() => handleSendMessage('Extract all key dates, payment amounts, and parties involved.', 'extract')}
              disabled={loading || !docFile}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 hover:bg-[#4b49ac]/10 hover:text-[#4b49ac] transition disabled:opacity-50"
            >
              <Zap className="h-3 w-3 text-[#7DA0FA]" />
              <span>Extract Dates & Amounts</span>
            </button>
            <button
              onClick={() => handleSendMessage('Explain the most difficult or legalistic clauses in plain language.', 'clauses')}
              disabled={loading || !docFile}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 hover:bg-[#4b49ac]/10 hover:text-[#4b49ac] transition disabled:opacity-50"
            >
              <FileQuestion className="h-3 w-3 text-[#7978e3]" />
              <span>Plain Language Clauses</span>
            </button>
            {compareMode && docFile2 && (
              <button
                onClick={() => handleSendMessage('Compare both uploaded documents and highlight substantive legal differences.', 'compare')}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 font-medium text-teal-800 hover:bg-teal-100 transition"
              >
                <Columns className="h-3 w-3 text-teal-600" />
                <span>Compare Files</span>
              </button>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2 max-h-[460px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4b49ac]/10 text-[#4b49ac]">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Ready to Analyze Your Document
                </h3>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Upload a PDF in the left sidebar to ground answers directly in your document&apos;s text.
                  All parsing is executed locally in client memory with strict security guarantees.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4b49ac] text-white flex-shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-xl rounded-2xl p-4 space-y-2 ${
                      m.role === 'user'
                        ? 'bg-[#4b49ac] text-white rounded-br-none shadow-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                    {/* Citations block */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Document Citations
                        </span>
                        {m.citations.map((c, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded-lg bg-white/80 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="h-3 w-3 text-teal-600 mt-0.5 flex-shrink-0" />
                            <span>
                              {c.pageNumber ? <strong>Page {c.pageNumber}: </strong> : null}
                              {c.excerptSnippet}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex gap-3 items-center text-xs text-slate-500 p-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#4b49ac]" />
                <span>Analyzing document contents and cross-referencing citations...</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Input */}
          <div className="pt-3 border-t border-slate-100">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  docFile
                    ? `Ask anything about ${docFile.name}...`
                    : 'Ask a question or upload a PDF above...'
                }
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 py-3 px-4 text-xs text-slate-900 focus:border-[#4b49ac] focus:outline-none focus:ring-1 focus:ring-[#4b49ac]"
              />

              <button
                type="submit"
                disabled={loading || (!inputQuery.trim() && !docFile)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4b49ac] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#413e96] transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Send</span>
              </button>
            </form>

            <p className="mt-2 text-[10px] text-slate-400 text-center">
              Answers are document-grounded. pdfkitfree does not provide certified legal conclusions. Treat sensitive uploaded text confidentially.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
