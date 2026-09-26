import React, { useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, Moon, RefreshCw, Send, ShieldCheck, Sun, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string; topic?: string; createdAt?: string };
interface Props { isOpen: boolean; onClose: () => void; currentScenarioTitle?: string; initialPrompt?: string }

const SUGGESTIONS = [
  'Tôi có nên sử dụng AI để làm bài tập không?',
  'Có cần nói với người khác khi tôi sử dụng AI không?',
  'Làm thế nào để bảo vệ dữ liệu cá nhân khi dùng AI?',
  'AI có thể thiên vị không?',
  'Tôi có nên tin hoàn toàn vào câu trả lời của AI không?',
  'Sử dụng AI để viết nội dung có vi phạm bản quyền không?',
];

function sessionId() {
  const key = 'ethics-chat-session';
  let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
}

export const DrLinhChatModal: React.FC<Props> = ({ isOpen, onClose, currentScenarioTitle, initialPrompt }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [light, setLight] = useState(false);
  const [error, setError] = useState('');
  const [failedMessage, setFailedMessage] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isOpen) end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, isOpen]);
  useEffect(() => {
    if (isOpen && initialPrompt) setInput(initialPrompt);
  }, [initialPrompt, isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoadingHistory(true);
    fetch(`/api/chat/history?sessionId=${sessionId()}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('History unavailable');
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data.messages)) {
          setMessages(data.messages.filter((message: Message) => message.role === 'user' || message.role === 'assistant'));
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingHistory(false));
    return () => controller.abort();
  }, [isOpen]);

  const send = async (suggestion?: string, retry = false) => {
    const content = (suggestion ?? input).trim();
    if (!content || loading) return;
    if (!retry) setMessages(old => [...old, { role: 'user', content, createdAt: new Date().toISOString() }]);
    setInput(''); setError(''); setFailedMessage(''); setLoading(true);
    try {
      const conversation = (retry ? messages : [...messages, { role: 'user' as const, content }]).slice(-24).map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        content: message.content,
      }));
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId(), message: content, messages: conversation }) });
      const data = await response.json().catch(() => ({})) as { reply?: unknown; error?: unknown; topic?: string };
      if (!response.ok || typeof data.reply !== 'string') {
        throw new Error(typeof data.error === 'string' ? data.error : 'Không thể nhận được câu trả lời. Vui lòng thử lại.');
      }
      setMessages(old => [...old, { role: 'assistant', content: data.reply, topic: data.topic, createdAt: new Date().toISOString() }]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể nhận được câu trả lời. Vui lòng thử lại.');
      setFailedMessage(content);
    }
    finally { setLoading(false); }
  };

  const reset = () => { localStorage.removeItem('ethics-chat-session'); setMessages([]); setInput(''); setError(''); setFailedMessage(''); };
  if (!isOpen) return null;
  const theme = light ? 'bg-stone-50 text-stone-900 border-stone-300' : 'bg-slate-900 text-slate-100 border-slate-700';

  return <aside className={`fixed z-50 bottom-3 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[440px] h-[min(720px,calc(100dvh-1.5rem))] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${theme}`} role="dialog" aria-label="AI Ethics Assistant" aria-modal="true">
    <header className="p-4 flex items-center justify-between border-b border-current/10">
      <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-2xl bg-orange-600 text-white grid place-items-center" aria-hidden="true"><Bot /></span><div><h2 className="font-bold">AI Ethics Assistant</h2><p className="text-xs opacity-70">Trợ lý hỗ trợ sử dụng AI có trách nhiệm</p></div></div>
      <div className="flex gap-1"><button type="button" className="p-2 rounded-lg hover:bg-current/10 focus-visible:outline focus-visible:outline-2" onClick={() => setLight(!light)} aria-label={light ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}>{light ? <Moon size={18}/> : <Sun size={18}/>}</button><button type="button" className="p-2 rounded-lg hover:bg-current/10 focus-visible:outline focus-visible:outline-2" onClick={reset} aria-label="Cuộc trò chuyện mới"><RefreshCw size={18}/></button><button type="button" className="p-2 rounded-lg hover:bg-current/10 focus-visible:outline focus-visible:outline-2" onClick={onClose} aria-label="Đóng chat"><X size={20}/></button></div>
    </header>
    {currentScenarioTitle && <div className="px-4 py-2 text-xs bg-orange-500/10">Ngữ cảnh: {currentScenarioTitle}</div>}
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4" aria-live="polite" aria-relevant="additions text">
      {loadingHistory && <p className="text-sm opacity-70">Đang tải cuộc trò chuyện…</p>}
      {!loadingHistory && messages.length === 0 && <section className="flex min-h-full flex-col justify-center gap-5 py-3" aria-labelledby="chat-welcome-title">
        <div className="text-center"><span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white" aria-hidden="true"><Bot /></span><h3 id="chat-welcome-title" className="text-lg font-bold">Xin chào! Tôi là AI Ethics Assistant.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 opacity-75">Tôi có thể giúp bạn tìm hiểu cách sử dụng AI một cách có trách nhiệm, an toàn và minh bạch.</p></div>
        <div className="grid gap-2" aria-label="Câu hỏi gợi ý">{SUGGESTIONS.map(item => <button type="button" key={item} onClick={() => send(item)} className="rounded-xl border border-current/15 p-3 text-left text-sm leading-5 transition-colors hover:border-orange-500/50 hover:bg-orange-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">{item}</button>)}</div>
      </section>}
      {messages.map((message, index) => <div key={`${message.createdAt ?? 'message'}-${index}`} className={`chat-message-enter flex min-w-0 gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
        {message.role === 'assistant' && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-600 text-white" aria-label="AI Ethics Assistant"><Bot size={16}/></span>}
        <div className={`min-w-0 max-w-[84%] ${message.role === 'user' ? 'text-right' : ''}`}>{message.topic && <p className="mb-1 text-[10px] uppercase tracking-wider opacity-60">{message.topic}</p>}<div className={`chat-markdown rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-orange-600 text-white' : 'bg-black/5 dark:bg-white/10'}`}>{message.role === 'assistant' ? <ReactMarkdown>{message.content}</ReactMarkdown> : <p className="whitespace-pre-wrap break-words">{message.content}</p>}</div><time className="mt-1 block text-[10px] opacity-55" dateTime={message.createdAt}>{message.createdAt ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt)) : ''}</time></div>
        {message.role === 'user' && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-600 text-white" aria-label="Bạn"><User size={16}/></span>}
      </div>)}
      {loading && <div className="flex items-center gap-2 text-sm opacity-75" role="status"><LoaderCircle size={16} className="animate-spin"/>AI đang suy nghĩ...</div>}
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300" role="alert"><p>{error}</p><button type="button" onClick={() => send(failedMessage, true)} className="mt-2 rounded-lg border border-current/30 px-3 py-1.5 font-semibold hover:bg-current/10 focus-visible:outline focus-visible:outline-2">Thử lại</button></div>}
      <div ref={end}/>
    </div>
    <footer className="border-t border-current/10 p-3"><form onSubmit={event => { event.preventDefault(); send(); }} className="flex items-end gap-2 rounded-2xl border border-current/20 p-2 focus-within:border-orange-500/60"><label className="sr-only" htmlFor="ethical-ai-chat-input">Câu hỏi của bạn</label><textarea id="ethical-ai-chat-input" value={input} maxLength={4000} rows={1} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} className="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-5 outline-none placeholder:opacity-60" placeholder="Nhập câu hỏi… (Enter để gửi, Shift + Enter xuống dòng)"/><button type="submit" aria-label="Gửi tin nhắn" disabled={!input.trim() || loading} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-600 text-white transition-colors hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"><Send size={18}/></button></form><p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] opacity-60"><ShieldCheck size={12}/>Không chia sẻ dữ liệu nhạy cảm · Kiểm chứng thông tin quan trọng</p></footer>
  </aside>;
};
