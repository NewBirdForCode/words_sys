import React, { FormEvent, useState } from 'react';
import { BookOpen, LogIn, UserPlus } from 'lucide-react';
import { UserProfile } from '../types';
import { createUser, hasUsers, loginUser } from '../utils/auth';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>(() => (hasUsers() ? 'login' : 'register'));
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [school, setSchool] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = isRegister
        ? await createUser({ name, className, school, password })
        : await loginUser(name, password);
      onAuthenticated(user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '操作失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
  };

  return (
    <main className="min-h-screen bg-[#FFFDF8] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="sunshine-halos" aria-hidden="true">
        <div className="sunshine-halo-blue" />
      </div>
      <section className="w-full max-w-md sunshine-card p-6 sm:p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-acc-grad text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#2C2C2C]">燃词 · 每日30词</h1>
          <p className="text-xs text-[#7B8A90] mt-2">登录后开始你的个人单词学习计划</p>
        </div>

        <div className="grid grid-cols-2 p-1 bg-[#F3F7F5] rounded-xl mb-5">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${mode === 'login' ? 'bg-white text-[#1C3E2A] shadow-sm' : 'text-[#7B8A90]'}`}
          >
            <LogIn className="w-4 h-4 inline-block mr-1 -mt-0.5" />登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${mode === 'register' ? 'bg-white text-[#1C3E2A] shadow-sm' : 'text-[#7B8A90]'}`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-1 -mt-0.5" />创建用户
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="block">
            <span className="block text-xs font-bold text-[#2C2C2C] mb-1.5">名字</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="请输入名字，登录时使用"
              autoComplete="username"
              className="w-full px-3.5 py-3 rounded-xl border border-[#DDE7E2] bg-white text-sm outline-none focus:border-[#38B889]"
              required
            />
          </label>

          {isRegister && (
            <>
              <label className="block">
                <span className="block text-xs font-bold text-[#2C2C2C] mb-1.5">班级</span>
                <input
                  value={className}
                  onChange={event => setClassName(event.target.value)}
                  placeholder="例如：五年级 2 班"
                  className="w-full px-3.5 py-3 rounded-xl border border-[#DDE7E2] bg-white text-sm outline-none focus:border-[#38B889]"
                  required
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[#2C2C2C] mb-1.5">学校</span>
                <input
                  value={school}
                  onChange={event => setSchool(event.target.value)}
                  placeholder="请输入学校名称"
                  className="w-full px-3.5 py-3 rounded-xl border border-[#DDE7E2] bg-white text-sm outline-none focus:border-[#38B889]"
                  required
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="block text-xs font-bold text-[#2C2C2C] mb-1.5">登录密码</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={isRegister ? '至少 8 位' : '请输入登录密码'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              className="w-full px-3.5 py-3 rounded-xl border border-[#DDE7E2] bg-white text-sm outline-none focus:border-[#38B889]"
              required
            />
          </label>

          {error && <p className="text-xs text-[#A33D3D] bg-[#FFF1F1] border border-[#F0CACA] rounded-xl px-3 py-2.5">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-acc-grad text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? '处理中…' : isRegister ? '创建用户并开始学习' : '登录学习系统'}
          </button>
        </form>

        <p className="text-[11px] text-[#98A7AC] text-center mt-5 leading-relaxed">
          用户信息和学习数据通过 FastAPI HTTPS 后端保存；密码不会以明文保存。
        </p>
      </section>
    </main>
  );
};
