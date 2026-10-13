import { UserProfile } from '../types';

const USERS_KEY = 'daily30_users_v1';
const CURRENT_USER_KEY = 'daily30_current_user_v1';

type StoredUser = UserProfile & { passwordHash: string };

function readUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function publicProfile(user: StoredUser): UserProfile {
  const { passwordHash: _passwordHash, ...profile } = user;
  return profile;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const data = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // 仅用于不支持 Web Crypto 的开发环境回退，不保存明文密码。
  let hash = 2166136261;
  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const currentId = localStorage.getItem(CURRENT_USER_KEY);
  if (!currentId) return null;
  const user = readUsers().find(item => item.id === currentId);
  return user ? publicProfile(user) : null;
}

export function hasUsers(): boolean {
  return readUsers().length > 0;
}

export async function createUser(input: {
  name: string;
  className: string;
  school: string;
  password: string;
}): Promise<UserProfile> {
  const name = input.name.trim();
  const className = input.className.trim();
  const school = input.school.trim();
  if (!name || !className || !school || !input.password) {
    throw new Error('请完整填写名字、班级、学校和登录密码。');
  }
  if (input.password.length < 6) {
    throw new Error('登录密码至少需要 6 位。');
  }

  const users = readUsers();
  if (users.some(user => normalizeName(user.name) === normalizeName(name))) {
    throw new Error('这个名字已经创建过用户，请直接登录或换一个名字。');
  }

  const user: StoredUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    className,
    school,
    createdAt: Date.now(),
    passwordHash: await hashPassword(input.password),
  };
  writeUsers([...users, user]);
  localStorage.setItem(CURRENT_USER_KEY, user.id);
  localStorage.setItem('daily30_user_id_v1', user.id);
  return publicProfile(user);
}

export async function loginUser(name: string, password: string): Promise<UserProfile> {
  const user = readUsers().find(item => normalizeName(item.name) === normalizeName(name));
  if (!user || user.passwordHash !== await hashPassword(password)) {
    throw new Error('名字或登录密码不正确。');
  }
  localStorage.setItem(CURRENT_USER_KEY, user.id);
  localStorage.setItem('daily30_user_id_v1', user.id);
  return publicProfile(user);
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_KEY);
}
