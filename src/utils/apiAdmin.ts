import { WordItem, Wordbook, UserProfile } from '../types';
import { ApiUser, ApiWordbook, createWordbookApi, getApiBaseUrl, getApiToken, toFrontendWordbook } from './api';

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.detail || `请求失败（${response.status}）`);
  return body as T;
}

export interface ApiMistake {
  id: number; student_id: number; wordbook_id: number; word_id: number; error_count: number; consecutive_correct: number;
  last_wrong_at: string; last_reviewed_at?: string | null; resolved_at?: string | null; is_resolved_current: boolean;
}
export interface ApiMemoryProgress {
  id: number; student_id: number; wordbook_id: number; word_id: number; first_learned_date: string; last_reviewed_date: string;
  next_review_date: string; correct_count: number; wrong_count: number; interval_step: number; is_graduated: boolean;
  is_manually_mastered: boolean; last_two_results: boolean[]; updated_at: string;
}
export interface ApiPlanSettings {
  id: number; student_id: number; wordbook_id?: number | null; daily_new_words: number; max_review_limit: number;
  interval_mode: 'standard' | 'relaxed'; new_word_order: 'random' | 'alphabetical'; updated_at: string;
}
export interface ApiClassroom { id: number; name: string; school_name: string; teacher_id: number; created_at: string; student_count: number; invite_code?: string | null; }

export async function fetchMistakes(): Promise<ApiMistake[]> { return requestJson('/api/mistakes'); }
export async function upsertMistake(wordId: string, wordbookId?: string): Promise<ApiMistake | null> {
  const id = Number(wordId); if (!Number.isInteger(id)) return null;
  return requestJson('/api/mistakes', { method: 'POST', body: JSON.stringify({ word_id: id, wordbook_id: wordbookId && Number(wordbookId) }) });
}
export async function resolveMistakeApi(wordId: string): Promise<void> {
  const id = Number(wordId); if (Number.isInteger(id)) await requestJson(`/api/mistakes/${id}/resolve`, { method: 'POST' });
}
export async function deleteMistakeApi(wordId: string): Promise<void> {
  const id = Number(wordId); if (Number.isInteger(id)) await requestJson(`/api/mistakes/${id}`, { method: 'DELETE' });
}

export async function fetchMemoryProgress(wordbookId?: string): Promise<ApiMemoryProgress[]> {
  const suffix = wordbookId && Number.isInteger(Number(wordbookId)) ? `?wordbook_id=${Number(wordbookId)}` : '';
  return requestJson(`/api/memory-progress${suffix}`);
}
export async function saveMemoryProgress(progress: Record<string, unknown>): Promise<ApiMemoryProgress | null> {
  const wordbookId = Number(progress.wordbookId); const wordId = Number(progress.wordId);
  if (!Number.isInteger(wordbookId) || !Number.isInteger(wordId)) return null;
  return requestJson('/api/memory-progress', { method: 'POST', body: JSON.stringify({
    wordbook_id: wordbookId, word_id: wordId, first_learned_date: progress.firstLearnedDate,
    last_reviewed_date: progress.lastReviewedDate, next_review_date: progress.nextReviewDate,
    correct_count: progress.correctCount || 0, wrong_count: progress.wrongCount || 0, interval_step: progress.intervalStep || 0,
    is_graduated: Boolean(progress.isGraduated), is_manually_mastered: Boolean(progress.isManuallyMastered), last_two_results: progress.lastTwoResults || [],
  }) });
}

export async function fetchPlanSettings(wordbookId?: string): Promise<ApiPlanSettings> {
  const suffix = wordbookId && Number.isInteger(Number(wordbookId)) ? `?wordbook_id=${Number(wordbookId)}` : '';
  return requestJson(`/api/plan/settings${suffix}`);
}
export async function savePlanSettingsApi(input: { wordbookId?: string; dailyNewWords: number; maxReviewLimit: number; intervalMode: string; newWordOrder?: string }): Promise<ApiPlanSettings> {
  return requestJson('/api/plan/settings', { method: 'PUT', body: JSON.stringify({ wordbook_id: input.wordbookId ? Number(input.wordbookId) : null, daily_new_words: input.dailyNewWords, max_review_limit: input.maxReviewLimit, interval_mode: input.intervalMode, new_word_order: input.newWordOrder || 'random' }) });
}

export async function fetchClassrooms(): Promise<ApiClassroom[]> { return requestJson('/api/classrooms'); }
export async function createClassroomApi(name: string, schoolName: string): Promise<ApiClassroom> { return requestJson('/api/classrooms', { method: 'POST', body: JSON.stringify({ name, school_name: schoolName }) }); }
export async function fetchClassStudents(classroomId: number): Promise<ApiUser[]> { return requestJson(`/api/classrooms/${classroomId}/students`); }
export async function joinClassByInvite(inviteCode: string): Promise<ApiClassroom> { return requestJson('/api/classrooms/join', { method: 'POST', body: JSON.stringify({ invite_code: inviteCode }) }); }
export async function regenerateClassInvite(classroomId: number): Promise<ApiClassroom> { return requestJson(`/api/classrooms/${classroomId}/invite-code`, { method: 'POST' }); }

export async function createSystemWordbookApi(name: string, description: string, words: WordItem[]): Promise<Wordbook> {
  return createWordbookApi({ name, description, words, kind: 'system' });
}
export async function createTeacherWordbookApi(name: string, description: string, words: WordItem[], classroomId: number): Promise<Wordbook> {
  return createWordbookApi({ name, description, words, kind: 'teacher', classroomIds: [classroomId] });
}
export async function setWordbookActiveApi(id: string, isActive: boolean): Promise<void> {
  await requestJson(`/api/wordbooks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) });
}
export async function fetchAllAdminWordbooks(): Promise<Wordbook[]> {
  const books = await requestJson<ApiWordbook[]>('/api/wordbooks?include_words=true');
  return books.map(toFrontendWordbook);
}

export function apiUserToProfile(user: ApiUser): UserProfile & { role?: ApiUser['role'] } {
  return { id: String(user.id), name: user.name, className: user.class_name || '', school: user.school_name || '', createdAt: Date.parse(user.created_at) || Date.now(), role: user.role };
}
