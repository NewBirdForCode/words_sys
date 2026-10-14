import React, { useState } from 'react';
import { LogIn, X } from 'lucide-react';
import { joinClassByInvite } from '../utils/apiAdmin';

interface Props { isOpen: boolean; onClose: () => void; onJoined?: () => void; }

export const JoinClassPanel: React.FC<Props> = ({ isOpen, onClose, onJoined }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const classroom = await joinClassByInvite(inviteCode.trim().toUpperCase());
      setMessage(`已加入「${classroom.name}」，现在可以学习班级词库了。`);
      setInviteCode('');
      onJoined?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加入班级失败');
    } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <section className="w-full max-w-md sunshine-card p-6" onClick={event => event.stopPropagation()}>
      <header className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-[#2C3E46] flex items-center gap-2"><LogIn className="w-5 h-5 text-emerald-600" />加入班级</h2><p className="text-xs text-[#78909C] mt-1">请输入老师提供的 8 位班级邀请码</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F2F7F5]"><X className="w-5 h-5" /></button></header>
      <form onSubmit={submit} className="space-y-4"><input value={inviteCode} onChange={event => setInviteCode(event.target.value.toUpperCase())} maxLength={8} placeholder="例如：ABCD2345" className="w-full px-4 py-3 rounded-xl border border-[#DDE7E2] text-center tracking-[0.25em] font-mono text-lg uppercase outline-none focus:border-emerald-400" required /><button disabled={submitting || inviteCode.trim().length < 4} className="w-full py-3 rounded-xl bg-acc-grad text-white font-bold disabled:opacity-50">{submitting ? '加入中…' : '加入班级'}</button></form>
      {message && <p className="mt-4 px-3 py-2 rounded-xl bg-[#F0F8F4] text-xs text-[#24734A]">{message}</p>}
    </section>
  </div>;
};
