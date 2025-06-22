const supabase = require('./supabase');

const CACHE_TABLE = 'cache';

async function getCache(key) {
  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select('value, expires_at')
    .eq('key', key)
    .single();
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.value;
}

async function setCache(key, value, ttlSeconds = 3600) {
  const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase.from(CACHE_TABLE).upsert({ key, value, expires_at });
}

module.exports = { getCache, setCache }; 