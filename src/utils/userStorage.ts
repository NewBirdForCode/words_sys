const CURRENT_USER_KEY = 'daily30_current_user_v1';

/**
 * 为需要按用户隔离的数据生成 localStorage 键。
 * 未登录时保留匿名键，登录后所有新数据写入对应用户命名空间。
 */
export function userScopedStorageKey(baseKey: string): string {
  if (typeof window === 'undefined') return baseKey;
  const userId = localStorage.getItem(CURRENT_USER_KEY);
  return userId ? `${baseKey}::${userId}` : baseKey;
}

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return 'user_default';
  return localStorage.getItem(CURRENT_USER_KEY) || localStorage.getItem('daily30_user_id_v1') || 'user_anonymous';
}
