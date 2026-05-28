/**
 * Supabase client for Pocket Khata analytics.
 *
 * Gracefully degrades when Supabase credentials are not configured:
 * - If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set to real values,
 *   a real Supabase client is created.
 * - If either is missing or set to placeholder defaults, a no-op client
 *   is returned that silently discards events (localStorage queue still works).
 *
 * This ensures the app works fully offline and without any external dependency.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Placeholder detection — if the user hasn't configured real credentials
const IS_PLACEHOLDER =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL.includes('your-project') ||
  SUPABASE_ANON_KEY === 'your-supabase-anon-key-here';

/** Whether real Supabase credentials are available */
export const isSupabaseConfigured = !IS_PLACEHOLDER;

let supabaseClient = null;
let _clientPromise = null;

/**
 * Get the Supabase client instance (async).
 * Returns null if credentials are not configured.
 */
async function getClient() {
  if (supabaseClient) return supabaseClient;
  if (IS_PLACEHOLDER) return null;

  if (!_clientPromise) {
    _clientPromise = (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
        });
        return supabaseClient;
      } catch (e) {
        console.warn('[Analytics] Failed to create Supabase client:', e.message);
        return null;
      }
    })();
  }
  return _clientPromise;
}

/**
 * Insert an analytics event into Supabase.
 * @param {object} event - { event_type, event_name, timestamp, device_info, metadata }
 * @returns {Promise<boolean>} Whether the insert succeeded.
 */
export async function insertAnalyticsEvent(analyticsEvent) {
  const client = await getClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('analytics_events')
      .insert({
        event_type: analyticsEvent.event_type,
        event_name: analyticsEvent.event_name,
        timestamp: analyticsEvent.timestamp,
        device_info: analyticsEvent.device_info || {},
        metadata: analyticsEvent.metadata || {},
      });

    if (error) {
      console.warn('[Analytics] Supabase insert error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Analytics] Supabase insert failed:', e.message);
    return false;
  }
}

/**
 * Bulk insert multiple analytics events.
 * @param {Array<object>} events - Array of event objects
 * @returns {Promise<number>} Number of successfully inserted events
 */
export async function bulkInsertAnalyticsEvents(events) {
  const client = await getClient();
  if (!client || events.length === 0) return 0;

  let successCount = 0;
  // Process in batches of 50 to avoid request size limits
  const BATCH_SIZE = 50;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    try {
      const { error } = await client
        .from('analytics_events')
        .insert(
          batch.map(e => ({
            event_type: e.event_type,
            event_name: e.event_name,
            timestamp: e.timestamp,
            device_info: e.device_info || {},
            metadata: e.metadata || {},
          }))
        );

      if (!error) {
        successCount += batch.length;
      } else {
        console.warn('[Analytics] Batch insert error:', error.message);
      }
    } catch (e) {
      console.warn('[Analytics] Batch insert failed:', e.message);
    }
  }

  return successCount;
}
