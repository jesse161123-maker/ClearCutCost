import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'clearcutcost_session_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedSessionId: string | null = null;

export async function getSessionId(): Promise<string> {
  if (cachedSessionId) return cachedSessionId;

  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      cachedSessionId = stored;
      return stored;
    }
    const newId = generateUUID();
    await AsyncStorage.setItem(SESSION_KEY, newId);
    cachedSessionId = newId;
    return newId;
  } catch {
    const fallback = generateUUID();
    cachedSessionId = fallback;
    return fallback;
  }
}

export async function clearSession(): Promise<void> {
  cachedSessionId = null;
  await AsyncStorage.removeItem(SESSION_KEY);
}
