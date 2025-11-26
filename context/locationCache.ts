import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "location_cache_v1";
const CACHE_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Save full cache
export const saveLocationCache = async (cache: any) => {
  const payload = {
    data: cache,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
};

// Load full cache
export const loadLocationCache = async () => {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  const expired = Date.now() - parsed.timestamp > CACHE_EXPIRE_MS;

  return expired ? null : parsed.data;
};
