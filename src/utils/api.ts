import { UserProfile, WordItem, Wordbook } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:8443').replace(/\/$/, '');
const TOKEN_KEY = 'words_sys_api_token_v1';
const USER_KEY = 'words_sys_api_user_v1';
const CURRENT_USER_KEY = 'daily30_current_user_v1';

export interface ApiUser {
  id: number;
  name: string;
  city_name?: string | null;
  district_name?: string | null;
  email?: string | null;
  school_name?: string | null;
  class_name?: string | null;
  role: 'student' | 'teacher' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface ApiWordbook {
  id: number;
  name: string;
  description?: string | null;
  kind: 'system' | 'teacher' | 'personal';
  owner_id?: number | null;
  source_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  classroom_ids: number[];
  words: Array<{
    id: number;
    external_id?: string | null;
    word: string;
    phonetic?: string | null;
    meaning?: string | null;
    example_en?: string | null;
    example_cn?: string | null;
  }>;
}

export interface ApiLearningRecord {
  id: number;
  student_id: number;
  wordbook_id: number;
  word_id: number;
  result: 'known' | 'wrong' | 'skipped';
  stage?: string | null;
  review_round: number;
  reviewed_at: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getApiToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

function setApiSession(token: string, user: ApiUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(CURRENT_USER_KEY, String(user.id));
}

export function getCachedApiUser(): ApiUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as ApiUser : null;
  } catch {
    return null;
  }
}

export function clearApiSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(`无法连接后端：${API_BASE_URL}。请确认 FastAPI HTTPS 服务已启动。`, 0);
  }
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    if (response.status === 401) clearApiSession();
    const detail = typeof payload === 'object' && payload && 'detail' in payload ? String((payload as { detail: unknown }).detail) : `请求失败（${response.status}）`;
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}

export async function registerUser(input: { name: string; role: 'student' | 'teacher'; className: string; city: string; district: string; school: string; password: string }): Promise<ApiUser> {
  const result = await request<{ access_token: string; user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: input.name, role: input.role, password: input.password, city_name: input.city, district_name: input.district, school_name: input.school, class_name: input.className }),
  });
  setApiSession(result.access_token, result.user);
  return result.user;
}

export async function loginUserApi(nameOrEmail: string, password: string): Promise<ApiUser> {
  const result = await request<{ access_token: string; user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name_or_email: nameOrEmail, password }),
  });
  setApiSession(result.access_token, result.user);
  return result.user;
}

export async function logoutUserApi(): Promise<void> {
  try {
    if (getApiToken()) await request<void>('/api/auth/logout', { method: 'POST' });
  } finally {
    clearApiSession();
  }
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  const user = await request<ApiUser>('/api/users/me');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function toFrontendWordbook(book: ApiWordbook): Wordbook {
  const id = String(book.id);
  return {
    id,
    book_id: id,
    name: book.name,
    book_name: book.name,
    description: book.description || undefined,
    default_mode: 'focused_quiz',
    default_batch_size: 30,
    enabled_modes: ['fast_review', 'focused_quiz'],
    words: book.words.map(word => ({
      id: String(word.id),
      word_id: word.external_id || String(word.id),
      book_id: id,
      wordbook_id: id,
      word: word.word,
      phonetic: word.phonetic || undefined,
      meaning: word.meaning || undefined,
      translation: word.meaning || undefined,
      exampleEn: word.example_en || undefined,
      exampleCn: word.example_cn || undefined,
      exampleSentence: word.example_en || undefined,
    })),
    created_at: Date.parse(book.created_at) || Date.now(),
    updated_at: Date.parse(book.updated_at) || Date.now(),
    is_system: book.kind === 'system',
    category: book.kind === 'system' ? 'DSE' : '自编',
  };
}

export async function fetchWordbooks(): Promise<Wordbook[]> {
  const books = await request<ApiWordbook[]>('/api/wordbooks?include_words=true');
  return books.map(toFrontendWordbook);
}

function toApiWords(words: WordItem[]) {
  return words.map(word => ({
    external_id: word.word_id || word.id,
    word: word.word,
    phonetic: word.phonetic,
    meaning: word.meaning || word.translation || word.chineseMeaning,
    example_en: word.exampleEn || word.exampleSentence || word.example,
    example_cn: word.exampleCn,
    payload: word,
  }));
}

export async function createWordbookApi(input: { name: string; description?: string; words: WordItem[]; kind?: 'personal' | 'teacher' | 'system'; classroomIds?: number[] }): Promise<Wordbook> {
  const result = await request<ApiWordbook>('/api/wordbooks', {
    method: 'POST',
    body: JSON.stringify({ name: input.name, description: input.description, kind: input.kind || 'personal', classroom_ids: input.classroomIds || [], words: toApiWords(input.words) }),
  });
  return toFrontendWordbook(result);
}

export async function updateWordbookApi(id: string, input: { name?: string; description?: string; words?: WordItem[] }): Promise<Wordbook> {
  const result = await request<ApiWordbook>(`/api/wordbooks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: input.name, description: input.description, words: input.words ? toApiWords(input.words) : undefined }),
  });
  return toFrontendWordbook(result);
}

export async function archiveWordbookApi(id: string): Promise<void> {
  await request<ApiWordbook>(`/api/wordbooks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: false }),
  });
}

export async function fetchLearningRecords(): Promise<ApiLearningRecord[]> {
  return request<ApiLearningRecord[]>('/api/learning/records?limit=1000');
}

export async function recordLearningApi(input: { wordbookId: string; wordId: string; result: 'known' | 'wrong' | 'skipped'; stage?: string; reviewRound?: number }): Promise<ApiLearningRecord | null> {
  const wordbookId = Number(input.wordbookId);
  const wordId = Number(input.wordId);
  if (!Number.isInteger(wordbookId) || !Number.isInteger(wordId)) return null;
  return request<ApiLearningRecord>('/api/learning/records', {
    method: 'POST',
    body: JSON.stringify({ wordbook_id: wordbookId, word_id: wordId, result: input.result, stage: input.stage, review_round: input.reviewRound || 1 }),
  });
}
