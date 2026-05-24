import AsyncStorage from '@react-native-async-storage/async-storage';

const FREE_ANALYSIS_LIMIT = 3;
const USAGE_KEY = 'clearcutcost_free_analysis_usage';

interface UsageState {
  count: number;
  month: string;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function getUsageState(): Promise<UsageState> {
  const month = currentMonthKey();
  const raw = await AsyncStorage.getItem(USAGE_KEY);

  if (!raw) {
    return { count: 0, month };
  }

  try {
    const parsed = JSON.parse(raw) as UsageState;

    if (parsed.month !== month) {
      return { count: 0, month };
    }

    return {
      count: Number.isFinite(parsed.count) ? parsed.count : 0,
      month,
    };
  } catch {
    return { count: 0, month };
  }
}

export async function hasFreeAnalysesRemaining() {
  const usage = await getUsageState();
  return usage.count < FREE_ANALYSIS_LIMIT;
}

export async function recordFreeAnalysisUsed() {
  const usage = await getUsageState();
  await AsyncStorage.setItem(
    USAGE_KEY,
    JSON.stringify({
      month: usage.month,
      count: usage.count + 1,
    })
  );
}

export async function getFreeAnalysisUsage() {
  const usage = await getUsageState();
  return {
    used: usage.count,
    limit: FREE_ANALYSIS_LIMIT,
  };
}
