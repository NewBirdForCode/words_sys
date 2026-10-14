import React, { useEffect, useState } from 'react';
import { Shield, Users, X, Plus, RefreshCw } from 'lucide-react';
import { UserProfile, WordItem, Wordbook } from '../types';
import { apiUserToProfile, createClassroomApi, createSystemWordbookApi, createTeacherWordbookApi, fetchAllAdminWordbooks, fetchClassStudents, fetchClassrooms, regenerateClassInvite, setWordbookActiveApi, ApiClassroom } from '../utils/apiAdmin';

interface Props { isOpen: boolean; onClose: () => void; currentUser: UserProfile; }

export const RoleManagementPanel: React.FC<Props> = ({ isOpen, onClose, currentUser }) => {
  const [classes, setClasses] = useState<ApiClassroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [className, setClassName] = useState('');
  const [bookName, setBookName] = useState('');
  const [bookText, setBookText] = useState('');
  const [teacherBookName, setTeacherBookName] = useState('');
  const [teacherBookText, setTeacherBookText] = useState('');
  const [books, setBooks] = useState<Wordbook[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const loadedClasses = await fetchClassrooms(); setClasses(loadedClasses);
      if (isAdmin) setBooks(await fetchAllAdminWordbooks());
      if (selectedClass) setStudents((await fetchClassStudents(selectedClass)).map(apiUserToProfile));
    } catch (error) { setMessage(error instanceof Error ? error.message : '管理数据加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isOpen) void load(); }, [isOpen]);
  if (!isOpen) return null;

  const createClass = async () => {
    if (!className.trim()) return;
    try { await createClassroomApi(className.trim(), currentUser.school || '未填写学校'); setClassName(''); setMessage('班级创建成功'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '班级创建失败'); }
  };
  const selectClass = async (id: number) => { setSelectedClass(id); try { setStudents((await fetchClassStudents(id)).map(apiUserToProfile)); } catch (error) { setMessage(error instanceof Error ? error.message : '学生加载失败'); } };
  const regenerateInvite = async () => {
    if (!selectedClass) return;
    try { const updated = await regenerateClassInvite(selectedClass); setClasses(prev => prev.map(item => item.id === selectedClass ? updated : item)); setMessage(`班级邀请码已更新：${updated.invite_code}`); }
    catch (error) { setMessage(error instanceof Error ? error.message : '邀请码更新失败'); }
  };
  const createSystemBook = async () => {
    const words: WordItem[] = bookText.split(/\r?\n/).map((line, index) => {
      const [word, meaning = '暂无中文释义', exampleEn = ''] = line.split(/[\t,，|]/).map(item => item.trim());
      return { id: `admin_${Date.now()}_${index}`, word, meaning, translation: meaning, exampleEn, exampleSentence: exampleEn };
    }).filter(item => item.word);
    if (!bookName.trim() || words.length === 0) { setMessage('请输入系统词库名称和单词内容'); return; }
    try { await createSystemWordbookApi(bookName.trim(), '管理员发布的系统词库', words); setBookName(''); setBookText(''); setMessage('系统词库已发布'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '系统词库发布失败'); }
  };
  const createTeacherBook = async () => {
    if (!selectedClass || !teacherBookName.trim()) { setMessage('请先选择班级并填写词库名称'); return; }
    const words: WordItem[] = teacherBookText.split(/\r?\n/).map((line, index) => {
      const [word, meaning = '暂无中文释义', exampleEn = ''] = line.split(/[\t,，|]/).map(item => item.trim());
      return { id: `teacher_${Date.now()}_${index}`, word, meaning, translation: meaning, exampleEn, exampleSentence: exampleEn };
    }).filter(item => item.word);
    if (words.length === 0) { setMessage('请输入至少一个单词'); return; }
    try { await createTeacherWordbookApi(teacherBookName.trim(), '教师发布的班级自定义词库', words, selectedClass); setTeacherBookName(''); setTeacherBookText(''); setMessage('班级词库已发布，班级学生可立即同步学习'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '班级词库发布失败'); }
  };
  const toggleSystemBook = async (book: Wordbook) => {
    try { await setWordbookActiveApi(book.id, false); setBooks(prev => prev.filter(item => item.id !== book.id)); setMessage(`已停用系统词库「${book.name}」`); }
    catch (error) { setMessage(error instanceof Error ? error.message : '系统词库更新失败'); }
  };

  return <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <section className="w-full max-w-4xl max-h-[90vh] overflow-y-auto sunshine-card p-5 sm:p-7" onClick={event => event.stopPropagation()}>
      <header className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold text-[#2C3E46] flex items-center gap-2">{isAdmin ? <Shield className="w-5 h-5 text-amber-600" /> : <Users className="w-5 h-5 text-emerald-600" />} {isAdmin ? '管理员控制台' : '教师班级管理'}</h2><p className="text-xs text-[#78909C] mt-1">数据通过 FastAPI 后端管理</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F2F7F5]"><X className="w-5 h-5" /></button></header>
      {message && <div className="mb-4 px-3 py-2 rounded-xl bg-[#F0F8F4] text-xs text-[#24734A]">{message}</div>}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-4"><h3 className="font-bold text-sm">{isAdmin ? '班级概览' : '我的班级'}</h3><div className="flex gap-2"><input value={className} onChange={e => setClassName(e.target.value)} placeholder="班级名称" className="flex-1 px-3 py-2 rounded-xl border border-[#DDE7E2] text-sm" />{!isAdmin && <button onClick={createClass} className="px-3 rounded-xl bg-acc-grad text-white"><Plus className="w-4 h-4" /></button>}</div><div className="space-y-2">{classes.map(item => <button key={item.id} onClick={() => void selectClass(item.id)} className={`w-full text-left p-3 rounded-xl border ${selectedClass === item.id ? 'border-emerald-400 bg-emerald-50' : 'border-[#E5ECE8] bg-white'}`}><div className="font-bold text-sm">{item.name}</div><div className="text-[11px] text-[#78909C]">{item.school_name} · {item.student_count} 名学生</div>{!isAdmin && item.invite_code && <div className="mt-1 text-xs font-mono font-bold text-emerald-700">邀请码：{item.invite_code}</div>}</button>)}{classes.length === 0 && <p className="text-xs text-[#78909C]">暂无班级</p>}</div>{selectedClass && <div className="border-t pt-4"><div className="flex items-center justify-between mb-2"><h4 className="font-bold text-xs">班级学生</h4>{!isAdmin && <button onClick={() => void regenerateInvite()} className="text-[11px] text-emerald-700">刷新邀请码</button>}</div>{!isAdmin && <p className="text-[11px] text-[#78909C] mb-2">请将邀请码发给学生，学生在“加入班级”中输入即可。</p>}<div className="space-y-1">{students.map(student => <div key={student.id} className="text-xs px-3 py-2 bg-[#F7FAF8] rounded-lg">{student.name} · {student.school} {student.className}</div>)}</div></div>}</div>
        {isAdmin ? <div className="space-y-4"><h3 className="font-bold text-sm">系统词库管理</h3><input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="系统词库名称" className="w-full px-3 py-2 rounded-xl border border-[#DDE7E2] text-sm" /><textarea value={bookText} onChange={e => setBookText(e.target.value)} placeholder={'每行：英文单词\t中文释义\t英文例句'} rows={7} className="w-full px-3 py-2 rounded-xl border border-[#DDE7E2] text-sm" /><button onClick={() => void createSystemBook()} className="w-full py-2.5 rounded-xl bg-acc-grad text-white text-sm font-bold">发布系统词库</button><div className="border-t pt-4"><h4 className="font-bold text-xs mb-2">已有系统词库</h4>{books.filter(book => book.is_system).map(book => <div key={book.id} className="flex justify-between items-center px-3 py-2 mb-1 bg-[#F7FAF8] rounded-lg text-xs"><span>{book.name} · {book.words.length} 词</span><button onClick={() => void toggleSystemBook(book)} className="text-red-500">停用</button></div>)}</div></div> : <div className="space-y-4"><h3 className="font-bold text-sm">发布班级自定义词库</h3><p className="text-xs text-[#78909C]">先在左侧选择班级，发布后该班级学生会同步看到词库。</p><input value={teacherBookName} onChange={e => setTeacherBookName(e.target.value)} placeholder="班级词库名称" className="w-full px-3 py-2 rounded-xl border border-[#DDE7E2] text-sm" /><textarea value={teacherBookText} onChange={e => setTeacherBookText(e.target.value)} placeholder={'每行：英文单词\t中文释义\t英文例句'} rows={9} className="w-full px-3 py-2 rounded-xl border border-[#DDE7E2] text-sm" /><button onClick={() => void createTeacherBook()} className="w-full py-2.5 rounded-xl bg-acc-grad text-white text-sm font-bold">发布到当前班级</button></div>}
      </div>
      <button onClick={() => void load()} disabled={loading} className="mt-5 flex items-center gap-1 text-xs text-[#60727B] hover:text-[#2C3E46]"><RefreshCw className="w-3 h-3" /> 刷新管理数据</button>
    </section>
  </div>;
};
