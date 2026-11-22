/**
 * SkyGuard Supabase Client & Cloud Workspace Persistence.
 * Provides authenticated real-time synchronization of saved locations
 * and alert preferences using Supabase PostgreSQL + PostgREST.
 *
 * Enforces zero-trust data privacy:
 * - Unauthenticated users securely persist data locally in the browser.
 * - Authenticated users synchronize with Supabase under strict per-user RLS policies.
 * - Provides live real-time WebSocket subscriptions for authoritative alerts.
 */
import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fkpennlfmpsgvrnmggwg.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_MmfFR4cERfbr54cHW3MU7w_03c0edZO";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface SavedLocation {
  id?: string;
  user_id?: string;
  name: string;
  formatted_label: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  timezone?: string;
  is_favorite?: boolean;
  created_at?: string;
}

export interface UserAlertPreferences {
  id?: string;
  user_id: string;
  min_severity: string;
  wants_telegram: boolean;
  telegram_chat_id?: string;
  wants_push: boolean;
  push_subscription_json?: string;
  updated_at?: string;
}

const DEVICE_STORAGE_KEY = "skyguard_device_user_id";
const LOCAL_SAVED_LOCATIONS_KEY = "skyguard_saved_locations_cache";
const LOCAL_PREFERENCES_KEY = "skyguard_user_preferences_cache";

/**
 * Get or initialize persistent device user identity.
 */
export function getDeviceUserId(): string {
  if (typeof window === "undefined") return "server_ssr";
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Check if the user is signed in with an authenticated Supabase identity.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Fetch saved locations from Supabase for authenticated user,
 * or from secure local storage for anonymous sessions.
 */
export async function getSavedLocations(): Promise<SavedLocation[]> {
  const authUserId = await getAuthenticatedUserId();

  if (authUserId) {
    try {
      const { data, error } = await supabase
        .from("saved_locations")
        .select("*")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_SAVED_LOCATIONS_KEY, JSON.stringify(data));
        }
        return data as SavedLocation[];
      }
    } catch (err) {
      console.warn("Error reading authenticated saved locations:", err);
    }
  }

  // Unauthenticated or offline: Read from local secure device cache
  return getLocalSavedLocations();
}

/**
 * Save location: writes to Supabase if authenticated, otherwise persists locally.
 */
export async function saveLocationToCloud(loc: {
  name: string;
  formatted_label: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  timezone?: string;
}): Promise<SavedLocation | null> {
  const authUserId = await getAuthenticatedUserId();

  const newLoc: SavedLocation = {
    user_id: authUserId || getDeviceUserId(),
    name: loc.name,
    formatted_label: loc.formatted_label,
    latitude: loc.latitude,
    longitude: loc.longitude,
    country_code: loc.country_code || "",
    timezone: loc.timezone || "",
    is_favorite: true,
  };

  if (authUserId) {
    try {
      const { data, error } = await supabase
        .from("saved_locations")
        .insert([{ ...newLoc, user_id: authUserId }])
        .select()
        .single();

      if (!error && data) {
        updateLocalCacheOnAdd(data as SavedLocation);
        return data as SavedLocation;
      }
    } catch (err) {
      console.warn("Error inserting authenticated location:", err);
    }
  }

  // Local device storage persistence
  const fallbackLoc: SavedLocation = {
    ...newLoc,
    id: "local_" + Date.now().toString(),
    created_at: new Date().toISOString(),
  };
  updateLocalCacheOnAdd(fallbackLoc);
  return fallbackLoc;
}

/**
 * Remove saved location by ID from Supabase and local cache.
 */
export async function removeSavedLocationFromCloud(id: string): Promise<boolean> {
  const authUserId = await getAuthenticatedUserId();

  if (authUserId && !id.startsWith("local_")) {
    try {
      await supabase.from("saved_locations").delete().eq("id", id).eq("user_id", authUserId);
    } catch (err) {
      console.warn("Error deleting authenticated location:", err);
    }
  }

  if (typeof window !== "undefined") {
    const current = getLocalSavedLocations();
    const updated = current.filter((l) => l.id !== id);
    localStorage.setItem(LOCAL_SAVED_LOCATIONS_KEY, JSON.stringify(updated));
  }
  return true;
}

/**
 * Sync user alert preferences with Supabase or local storage.
 */
export async function syncUserAlertPreferences(prefs: {
  min_severity: string;
  wants_telegram: boolean;
  telegram_chat_id?: string;
  wants_push: boolean;
}): Promise<boolean> {
  const authUserId = await getAuthenticatedUserId();

  if (authUserId) {
    try {
      const { error } = await supabase.from("user_alert_preferences").upsert(
        {
          user_id: authUserId,
          min_severity: prefs.min_severity,
          wants_telegram: prefs.wants_telegram,
          telegram_chat_id: prefs.telegram_chat_id,
          wants_push: prefs.wants_push,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (!error) return true;
    } catch (err) {
      console.warn("Preferences sync exception:", err);
    }
  }

  // Local storage persistence
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(prefs));
  }
  return true;
}

export type RealtimeConnectionStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR" | "CONNECTING";

/**
 * Real-time listener for authoritative emergency alerts via Supabase WebSockets.
 * Dispatches live updates immediately when new emergency alerts arrive.
 * Communicates authentic connection status to prevent misleading UI claims.
 */
export function subscribeToRealtimeAlerts(
  onUpdate: (alert: any) => void,
  onStatusChange?: (status: RealtimeConnectionStatus) => void
): () => void {
  try {
    if (onStatusChange) onStatusChange("CONNECTING");
    const channel: RealtimeChannel = supabase
      .channel("public-authoritative-alerts-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "authoritative_alerts" },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (onStatusChange) {
          if (status === "SUBSCRIBED") {
            onStatusChange("SUBSCRIBED");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            onStatusChange(status);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    if (onStatusChange) onStatusChange("CHANNEL_ERROR");
    console.warn("Real-time alert subscription unavailable:", err);
    return () => {};
  }
}

function getLocalSavedLocations(): SavedLocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function updateLocalCacheOnAdd(loc: SavedLocation) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalSavedLocations();
    const exists = current.some(
      (l) =>
        Math.abs(l.latitude - loc.latitude) < 0.01 &&
        Math.abs(l.longitude - loc.longitude) < 0.01
    );
    if (!exists) {
      const updated = [loc, ...current];
      localStorage.setItem(LOCAL_SAVED_LOCATIONS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
}
