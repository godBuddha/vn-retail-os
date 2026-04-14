'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, Send, Star, Trash2, AlertOctagon, Mail, Search,
  RefreshCw, ShoppingBag, BarChart2, AlertTriangle, PenSquare,
  X, ExternalLink, Clock, CheckCircle2, XCircle,
  MailOpen, ArrowLeft, Ban, RotateCcw
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

// ─── helpers ────────────────────────────────────────────────
const statusInfo: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  PENDING:  { icon: <Clock size={12} />,        label: 'Đang gửi',  color: 'text-yellow-500 bg-yellow-500/10' },
  SENT:     { icon: <CheckCircle2 size={12} />, label: 'Đã gửi',   color: 'text-emerald-500 bg-emerald-500/10' },
  OPENED:   { icon: <MailOpen size={12} />,     label: 'Đã mở',    color: 'text-blue-500 bg-blue-500/10' },
  FAILED:   { icon: <XCircle size={12} />,      label: 'Lỗi',      color: 'text-red-500 bg-red-500/10' },
  BOUNCED:  { icon: <Ban size={12} />,          label: 'Bounce',   color: 'text-orange-500 bg-orange-500/10' },
};

const typeLabels: Record<string, string> = {
  ORDER_RECEIPT:   'Hoá đơn',
  DAILY_REPORT:    'Báo cáo',
  LOW_STOCK_ALERT: 'Cảnh báo',
  CUSTOM:          'Thủ công',
  INBOUND:         'Đến',
};

function relativeTime(dt: string) {
  const diff = (Date.now() - new Date(dt).getTime()) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getInitials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

// ─── types ─────────────────────────────────────────────────
interface EmailItem {
  id: string; from: string; to: string[]; subject: string;
  type: string; status: string; isRead: boolean; isStarred: boolean;
  isDeleted: boolean; isSpam: boolean; relatedId?: string;
  createdAt: string; preview?: string;
}

// ─── folders config ────────────────────────────────────────
const folders = [
  { id: 'sent',     label: 'Đã gửi',      icon: Send,         color: 'text-muted-foreground' },
  { id: 'inbox',    label: 'Hộp đến',     icon: Inbox,        color: 'text-violet-500' },
  { id: 'starred',  label: 'Quan trọng',  icon: Star,         color: 'text-yellow-500' },
  { id: 'trash',    label: 'Thùng rác',   icon: Trash2,       color: 'text-red-500' },
  { id: 'spam',     label: 'Thư rác',     icon: AlertOctagon, color: 'text-orange-500' },
];

const typeFilters = [
  { id: 'ORDER_RECEIPT',   label: 'Hoá đơn ĐH',    icon: ShoppingBag,   color: 'text-emerald-500' },
  { id: 'DAILY_REPORT',    label: 'Báo cáo ngày',   icon: BarChart2,     color: 'text-blue-500' },
  { id: 'LOW_STOCK_ALERT', label: 'Cảnh báo kho',   icon: AlertTriangle, color: 'text-orange-500' },
];

// ─── Compose Modal ─────────────────────────────────────────
function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/mail/compose', { to: [to], subject, bodyHtml: `<p>${body.replace(/\n/g, '<br/>')}</p>` }),
    onSuccess: () => { toast.success('Email đã gửi!'); onClose(); },
    onError: () => toast.error('Gửi email thất bại'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <PenSquare size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-foreground">Soạn thư mới</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* Fields */}
        <div className="p-5 space-y-3 bg-card">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Đến</label>
            <input
              value={to} onChange={e => setTo(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tiêu đề</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Tiêu đề email..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nội dung</label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              rows={8} placeholder="Nội dung email..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>
        </div>
        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-2 bg-card">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Huỷ</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!to || !subject || mutation.isPending}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {mutation.isPending ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Preview Panel ────────────────────────────────────
function EmailPreview({ email, onBack }: { email: any; onBack: () => void }) {
  const qc = useQueryClient();
  const starMut = useMutation({
    mutationFn: () => api.patch(`/mail/${email.id}/star`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mail'] }); qc.invalidateQueries({ queryKey: ['mail', email.id] }); },
  });
  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/mail/${email.id}`),
    onSuccess: () => { toast.success('Đã chuyển vào thùng rác'); qc.invalidateQueries({ queryKey: ['mail'] }); onBack(); },
  });
  const restoreMut = useMutation({
    mutationFn: () => api.patch(`/mail/${email.id}/restore`),
    onSuccess: () => { toast.success('Đã khôi phục'); qc.invalidateQueries({ queryKey: ['mail'] }); onBack(); },
  });

  const s = statusInfo[email.status] || statusInfo.SENT;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0 bg-card">
        <button onClick={onBack} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors md:hidden">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate">{email.subject}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.color}`}>
              {s.icon}{s.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{typeLabels[email.type] || email.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => starMut.mutate()}
            className={`p-2 rounded-lg transition-colors ${email.isStarred ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground hover:text-yellow-500 hover:bg-accent'}`}
            title="Đánh dấu quan trọng"
          >
            <Star size={15} fill={email.isStarred ? 'currentColor' : 'none'} />
          </button>
          {email.isDeleted ? (
            <button onClick={() => restoreMut.mutate()} className="p-2 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-accent transition-colors" title="Khôi phục">
              <RotateCcw size={15} />
            </button>
          ) : (
            <button onClick={() => deleteMut.mutate()} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-accent transition-colors" title="Xóa">
              <Trash2 size={15} />
            </button>
          )}
          {email.relatedId && (
            <Link href={`/orders/${email.relatedId}`} className="p-2 rounded-lg text-muted-foreground hover:text-violet-500 hover:bg-accent transition-colors" title="Xem đơn hàng">
              <ExternalLink size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="px-6 py-3 bg-muted/30 border-b border-border flex-shrink-0">
        <div className="grid grid-cols-[60px_1fr] gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">Từ:</span>
          <span className="text-foreground">{email.from}</span>
          <span className="text-muted-foreground">Đến:</span>
          <span className="text-foreground">{(email.to || []).join(', ')}</span>
          <span className="text-muted-foreground">Thời gian:</span>
          <span className="text-muted-foreground">{new Date(email.createdAt).toLocaleString('vi-VN')}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 bg-muted/20">
        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
              /* Force light theme inside iframe regardless of app dark mode */
              html, body {
                margin: 0; padding: 0;
                background: #ffffff !important;
                color: #1e293b !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color-scheme: light !important;
              }
              * { box-sizing: border-box; }
              a { color: #7c3aed; }
              img { max-width: 100%; height: auto; }
            </style></head><body style="padding:24px;">${
              email.bodyHtml || '<p style="color:#64748b">Không có nội dung</p>'
            }</body></html>`}
            className="w-full min-h-[420px] border-0 bg-white"
            sandbox="allow-same-origin"
            title="Email content"
            onLoad={(e) => {
              // Auto-resize to content
              const iframe = e.currentTarget;
              try {
                const body = iframe.contentDocument?.body;
                if (body) iframe.style.height = body.scrollHeight + 'px';
              } catch (_) {}
            }}
          />
        </div>
      </div>

    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function MailCenterPage() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState('sent');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const queryParams = { folder: typeFilter ? undefined : folder, type: typeFilter || undefined, search: search || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mail', queryParams],
    queryFn: () => api.get('/mail', { params: queryParams }).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['mail-stats'],
    queryFn: () => api.get('/mail/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: selectedEmail } = useQuery({
    queryKey: ['mail', selectedId],
    queryFn: () => api.get(`/mail/${selectedId}`).then(r => r.data),
    enabled: !!selectedId,
  });

  const emails: EmailItem[] = data?.data || [];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    qc.invalidateQueries({ queryKey: ['mail', queryParams] });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden">
      {/* ── Pane 1: Folders ─────────────── */}
      <div className={`flex-shrink-0 w-56 bg-card border-r border-border flex flex-col ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
        {/* Compose */}
        <div className="p-3">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm font-medium transition-colors shadow-lg shadow-violet-900/20"
          >
            <PenSquare size={15} />
            Soạn thư
          </button>
        </div>

        {/* Folder list */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2">Hộp thư</p>
          {folders.map(f => {
            const Icon = f.icon;
            const count = stats?.[f.id === 'starred' ? 'starred' : f.id] || 0;
            const isActive = !typeFilter && folder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setFolder(f.id); setTypeFilter(null); setSelectedId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300 border border-violet-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-violet-500' : f.color} />
                <span className="flex-1 text-left">{f.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-violet-500/20 text-violet-500' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-4 pb-2">Phân loại</p>
          {typeFilters.map(f => {
            const Icon = f.icon;
            const count = stats?.[f.id === 'ORDER_RECEIPT' ? 'orderReceipt' : f.id === 'DAILY_REPORT' ? 'dailyReport' : 'lowStock'] || 0;
            const isActive = typeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setTypeFilter(f.id); setSelectedId(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300 border border-violet-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-violet-500' : f.color} />
                <span className="flex-1 text-left">{f.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-violet-500/20 text-violet-500' : 'bg-muted text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Unread badge */}
        {stats?.unread > 0 && (
          <div className="px-3 pb-3">
            <div className="px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <p className="text-[11px] text-violet-500 text-center">{stats.unread} chưa đọc</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Pane 2: Email List ──────────── */}
      <div className={`flex-shrink-0 w-80 border-r border-border flex flex-col bg-card/50 ${selectedId ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none'}`}>
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm email..."
              className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* List header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs text-muted-foreground">{data?.total || 0} email</span>
          <button onClick={() => refetch()} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Email items */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-border animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 bg-muted rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Mail size={40} />
              <p className="text-sm">Không có email</p>
            </div>
          ) : (
            emails.map((email) => {
              const s = statusInfo[email.status] || statusInfo.SENT;
              const isSelected = selectedId === email.id;
              return (
                <button
                  key={email.id}
                  onClick={() => handleSelect(email.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent/50 transition-all ${
                    isSelected ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : ''
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/70 to-blue-600/70 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(email.type === 'INBOUND' ? email.from : (email.to?.[0] || email.from))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-${email.isRead ? 'normal text-muted-foreground' : 'semibold text-foreground'} truncate flex-1`}>
                          {email.type === 'INBOUND' ? email.from : (email.to?.[0] || '—')}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{relativeTime(email.createdAt)}</span>
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${email.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {email.subject}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground truncate flex-1">{email.preview}</p>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {email.isStarred && <Star size={10} className="text-yellow-500" fill="currentColor" />}
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${s.color}`}>
                            {s.icon}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Pane 3: Preview ─────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background ${selectedId ? 'flex' : 'hidden lg:flex'}`}>
        {selectedEmail ? (
          <EmailPreview email={selectedEmail} onBack={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <Mail size={36} className="text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium">Chọn email để xem nội dung</p>
              <p className="text-xs text-muted-foreground mt-1">Hoặc soạn thư mới bằng nút bên trái</p>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm font-medium transition-colors"
            >
              <PenSquare size={14} />
              Soạn thư mới
            </button>
          </div>
        )}
      </div>

      {/* Floating compose for mobile */}
      {!showCompose && selectedId && (
        <button
          onClick={() => setShowCompose(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-xl flex items-center justify-center text-white transition-all z-30 lg:hidden"
        >
          <PenSquare size={20} />
        </button>
      )}

      {/* Compose modal */}
      {showCompose && <ComposeModal onClose={() => { setShowCompose(false); qc.invalidateQueries({ queryKey: ['mail'] }); }} />}
    </div>
  );
}
