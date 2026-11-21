"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Send,
  Sliders,
  MapPin,
  Info,
  Radio,
  RefreshCw,
  Compass,
} from "lucide-react";
import {
  AlertCategory,
  AlertSeverity,
  PushPreferencesResponse,
  PushPermissionStatus,
} from "@/types";
import {
  getVapidPublicKey,
  subscribePush,
  getPushPreferences,
  updatePushPreferences,
  unsubscribePush,
  sendDiagnosticPushTest,
} from "@/lib/api";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry?: string;
  selectedLatitude?: number;
  selectedLongitude?: number;
  selectedLocationLabel?: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedCountry,
  selectedLatitude,
  selectedLongitude,
  selectedLocationLabel,
}) => {
  const [permission, setPermission] = useState<PushPermissionStatus>("default");
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [possessionToken, setPossessionToken] = useState<string | null>(null);

  // Preferences
  const [countryCode, setCountryCode] = useState<string>(selectedCountry || "IN");
  const [radiusKm, setRadiusKm] = useState<number>(500);
  const [wantsCountryWide, setWantsCountryWide] = useState<boolean>(false);
  const [selectedCategories, setSelectedCategories] = useState<AlertCategory[]>([
    "OFFICIAL_CAP_WARNING",
    "GDACS_DISASTER_ALERT",
  ]);
  const [minSeverity, setMinSeverity] = useState<AlertSeverity>("Moderate");
  const [loadingPreferences, setLoadingPreferences] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Load subscription state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PushPermissionStatus);

    let isActive = true;
    const savedSubId = localStorage.getItem("skyguard_push_sub_id");
    const savedToken = localStorage.getItem("skyguard_push_token");

    if (savedSubId && savedToken) {
      setSubscriptionId(savedSubId);
      setPossessionToken(savedToken);
      setIsSubscribed(true);
      setLoadingPreferences(true);

      // Fetch fresh preferences from backend
      getPushPreferences(savedToken)
        .then((prefs) => {
          if (!isActive) return;
          if (prefs.country_code) setCountryCode(prefs.country_code);
          if (prefs.radius_km) setRadiusKm(prefs.radius_km);
          if (prefs.wants_country_wide !== undefined) setWantsCountryWide(prefs.wants_country_wide);
          if (prefs.categories) setSelectedCategories(prefs.categories);
          if (prefs.min_severity) setMinSeverity(prefs.min_severity);
          setIsSubscribed(prefs.is_active);
        })
        .catch((err) => {
          if (!isActive) return;
          const msg = (err?.message || "").toLowerCase();
          if (msg.includes("401") || msg.includes("403") || msg.includes("token") || msg.includes("unauthorized")) {
            // Definitively invalid or expired token
            localStorage.removeItem("skyguard_push_sub_id");
            localStorage.removeItem("skyguard_push_token");
            setIsSubscribed(false);
          } else {
            // Network or 503 error: retain credentials and allow retry
            console.warn("Transient error loading push preferences, retaining credentials:", err);
          }
        })
        .finally(() => {
          if (isActive) setLoadingPreferences(false);
        });
    }

    return () => {
      isActive = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle explicit permission and subscription
  const handleEnableNotifications = async () => {
    setLoading(true);
    setFeedback(null);
    setTestStatus(null);

    try {
      if (!("Notification" in window)) {
        throw new Error("Push notifications are not supported by this browser.");
      }

      // Request browser permission explicitly upon user click
      const permResult = await Notification.requestPermission();
      setPermission(permResult as PushPermissionStatus);

      if (permResult !== "granted") {
        throw new Error("Notification permission was denied or dismissed.");
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const vapidPublicKey = await getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe with browser PushManager
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const subJson = pushSubscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Browser returned incomplete push subscription keys.");
      }

      const savedToken = localStorage.getItem("skyguard_push_token") || undefined;

      // Register with SkyGuard backend
      const res = await subscribePush({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        country_code: countryCode.trim() ? countryCode.toUpperCase() : undefined,
        latitude: selectedLatitude,
        longitude: selectedLongitude,
        radius_km: radiusKm,
        wants_country_wide: wantsCountryWide,
        existing_token: savedToken,
        categories: selectedCategories,
        min_severity: minSeverity,
      });

      // Persist possession credentials securely in client localStorage
      localStorage.setItem("skyguard_push_sub_id", res.subscription_id);
      localStorage.setItem("skyguard_push_token", res.possession_token);
      setSubscriptionId(res.subscription_id);
      setPossessionToken(res.possession_token);
      setIsSubscribed(true);

      setFeedback("Push notifications enabled successfully! Device is registered.");
    } catch (err: any) {
      console.error("Subscription error:", err);
      setFeedback(`Error: ${err.message || "Failed to enable notifications."}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Unsubscribe
  const handleUnsubscribe = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      if (subscriptionId && possessionToken) {
        await unsubscribePush(subscriptionId, possessionToken);
      }

      // Unsubscribe locally in browser
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }

      localStorage.removeItem("skyguard_push_sub_id");
      localStorage.removeItem("skyguard_push_token");
      setSubscriptionId(null);
      setPossessionToken(null);
      setIsSubscribed(false);
      setFeedback("Notifications disabled and subscription removed from server.");
    } catch (err: any) {
      console.error("Unsubscribe error:", err);
      setFeedback(`Unsubscribe error: ${err.message || "Failed to remove subscription."}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Preferences
  const handleSavePreferences = async () => {
    if (!possessionToken) return;
    setLoading(true);
    setFeedback(null);

    try {
      await updatePushPreferences(possessionToken, {
        country_code: countryCode.trim() ? countryCode.toUpperCase() : undefined,
        radius_km: radiusKm,
        wants_country_wide: wantsCountryWide,
        categories: selectedCategories,
        min_severity: minSeverity,
      });
      setFeedback("Preferences updated and synchronized with SkyGuard server.");
    } catch (err: any) {
      setFeedback(`Failed to update preferences: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Dispatch Diagnostic Test Notification
  const handleSendDiagnosticTest = async () => {
    if (!possessionToken) return;
    setLoading(true);
    setTestStatus("Sending diagnostic check...");

    try {
      const res = await sendDiagnosticPushTest(possessionToken);
      setTestStatus(`Diagnostic push delivered! (${res.note})`);
    } catch (err: any) {
      setTestStatus(`Test push failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: AlertCategory) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#11141b] border border-[#202532] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c212d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#171b24] text-amber-400 rounded-xl border border-[#262c3b] shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-sans">
                Global Push Notification Center
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Privacy-preserving alerts for official WMO CAP &amp; GDACS disasters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission & Status Bar */}
        <div className="p-4 rounded-xl bg-[#0c0e13] border border-[#1e2330] flex items-center justify-between shadow-inner">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">
              Browser Permission
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  permission === "granted"
                    ? "bg-emerald-400 shadow-[0_0_6px_#10B981]"
                    : permission === "denied"
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-bold text-white capitalize">{permission}</span>
              {isSubscribed && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ml-1">
                  DEVICE ACTIVE
                </span>
              )}
            </div>
          </div>

          {!isSubscribed ? (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === "denied"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 font-sans"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Notifications</span>
            </button>
          ) : (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all active:scale-95 font-sans"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Disable</span>
            </button>
          )}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 font-mono ${
              feedback.startsWith("Error")
                ? "bg-rose-950/30 text-rose-300 border border-rose-500/30"
                : "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Notification Preferences (Configurable when subscribed) */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider font-sans">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Notification Filters &amp; Coverage</span>
          </div>

          {/* Country Code & Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Country Code (ISO 2-letter)
              </label>
              <input
                type="text"
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="e.g. IN, US, DE"
                className="w-full px-3 py-2 bg-[#0c0e13] border border-[#202532] rounded-lg text-xs text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Coordinate Proximity Radius
              </label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0c0e13] border border-[#202532] rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500/60 font-mono"
              >
                <option value={100}>Within 100 km</option>
                <option value={300}>Within 300 km</option>
                <option value={500}>Within 500 km</option>
                <option value={1000}>Within 1,000 km</option>
              </select>
            </div>
          </div>

          {/* Country-Wide Bulletins Toggle (Opt-in) */}
          <div className="p-3 rounded-xl bg-[#0c0e13] border border-[#1e2330] space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsCountryWide}
                onChange={(e) => setWantsCountryWide(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-500 bg-[#161a24] border-[#252b3a]"
              />
              <div>
                <span className="text-xs font-semibold text-white">
                  Receive Country-Wide Emergency Bulletins
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed font-mono">
                  Opt in to receive official national emergency bulletins affecting your entire country even if an alert polygon is outside your immediate coordinates. When disabled, you only receive localized notifications verified within your coordinates.
                </p>
              </div>
            </label>
          </div>

          {/* Alert Categories */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Alert Categories
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0c0e13] border border-[#1e2330] cursor-pointer hover:bg-[#161a24] transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("OFFICIAL_CAP_WARNING")}
                  onChange={() => toggleCategory("OFFICIAL_CAP_WARNING")}
                  className="rounded text-amber-500 focus:ring-amber-500 bg-[#161a24] border-[#252b3a]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white">Official CAP Severe Warnings</span>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    National meteorological bulletins (WMO SWIC / Member States)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0c0e13] border border-[#1e2330] cursor-pointer hover:bg-[#161a24] transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("GDACS_DISASTER_ALERT")}
                  onChange={() => toggleCategory("GDACS_DISASTER_ALERT")}
                  className="rounded text-amber-500 focus:ring-amber-500 bg-[#161a24] border-[#252b3a]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white">GDACS Multi-Hazard Disasters</span>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Tropical cyclones, major floods, earthquakes (UN OCHA / EC)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Minimum Severity */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              Minimum Severity Threshold
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Moderate", "Severe", "Extreme"] as AlertSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setMinSeverity(sev)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all font-mono ${
                    minSeverity === sev
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-[#0c0e13] border-[#202532] text-zinc-400 hover:text-white"
                  }`}
                >
                  {sev}+
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {isSubscribed && (
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleSavePreferences}
                disabled={loading || loadingPreferences}
                className="w-full sm:flex-1 py-2 bg-[#171b24] hover:bg-[#202633] border border-[#252b3a] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 font-sans"
              >
                {loadingPreferences ? "Loading Preferences..." : "Save Preferences"}
              </button>

              <button
                onClick={handleSendDiagnosticTest}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 font-sans"
                title="Send technical diagnostic test notification with no weather claims"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Web Push</span>
              </button>
            </div>
          )}

          {testStatus && (
            <p className="text-[11px] text-zinc-300 bg-[#0c0e13] p-2.5 rounded-lg border border-[#1e2330] font-mono">
              {testStatus}
            </p>
          )}
        </div>

        {/* Data Integrity & Privacy Guarantee Notice */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330] text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-zinc-300">Privacy &amp; Data Integrity Invariants:</strong> Subscriptions are possession-bound via private tokens. We never store personal identities or precise continuous geolocation. Push alerts are dispatched strictly upon genuine active bulletins from WMO CAP &amp; GDACS; zero notifications will be simulated or fabricated.
          </span>
        </div>
      </div>
    </div>
  );
};
