import { UserProfile } from '../types';
import {
  ApiUser,
  clearApiSession,
  getApiToken,
  getCachedApiUser,
  loginUserApi,
  logoutUserApi,
  registerUser,
} from './api';

function toUserProfile(user: ApiUser): UserProfile {
  return {
    id: String(user.id),
    name: user.name,
    className: user.class_name || '',
    school: user.school_name || '',
    createdAt: Date.parse(user.created_at) || Date.now(),
  };
}

export function getCurrentUser(): UserProfile | null {
  const user = getCachedApiUser();
  return user && getApiToken() ? toUserProfile(user) : null;
}

export function hasUsers(): boolean {
  return Boolean(getApiToken() || getCachedApiUser());
}

export async function createUser(input: {
  name: string;
  className: string;
  school: string;
  password: string;
}): Promise<UserProfile> {
  const user = await registerUser(input);
  return toUserProfile(user);
}

export async function loginUser(name: string, password: string): Promise<UserProfile> {
  const user = await loginUserApi(name, password);
  return toUserProfile(user);
}

export function logoutUser(): void {
  // 先清理本地令牌，避免用户在请求未完成时继续读取旧账户数据。
  const logoutPromise = logoutUserApi();
  void logoutPromise;
  clearApiSession();
}
