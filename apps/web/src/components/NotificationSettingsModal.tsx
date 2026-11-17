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
  const [selectedCategories, setSelectedCategories] = useState<AlertCategory[]>([
    "OFFICIAL_CAP_WARNING",
    "GDACS_DISASTER_ALERT",
  ]);
  const [minSeverity, setMinSeverity] = useState<AlertSeverity>("Moderate");

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

    const savedSubId = localStorage.getItem("skyguard_push_sub_id");
    const savedToken = localStorage.getItem("skyguard_push_token");

    if (savedSubId && savedToken) {
      setSubscriptionId(savedSubId);
      setPossessionToken(savedToken);
      setIsSubscribed(true);

      // Fetch fresh preferences from backend
      getPushPreferences(savedToken)
        .then((prefs) => {
          if (prefs.country_code) setCountryCode(prefs.country_code);
          if (prefs.radius_km) setRadiusKm(prefs.radius_km);
          if (prefs.categories) setSelectedCategories(prefs.categories);
          if (prefs.min_severity) setMinSeverity(prefs.min_severity);
          setIsSubscribed(prefs.is_active);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem("skyguard_push_sub_id");
          localStorage.removeItem("skyguard_push_token");
          setIsSubscribed(false);
        });
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Global Push Notification Center
              </h3>
              <p className="text-xs text-slate-400">
                Privacy-preserving alerts for official WMO CAP &amp; GDACS disasters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission & Status Bar */}
        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Browser Permission
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  permission === "granted"
                    ? "bg-emerald-400"
                    : permission === "denied"
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-bold text-white capitalize">{permission}</span>
              {isSubscribed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ml-1">
                  DEVICE ACTIVE
                </span>
              )}
            </div>
          </div>

          {!isSubscribed ? (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === "denied"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Notifications</span>
            </button>
          ) : (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Disable</span>
            </button>
          )}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.startsWith("Error")
                ? "bg-rose-950/40 text-rose-300 border border-rose-500/40"
                : "bg-emerald-950/40 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Notification Preferences (Configurable when subscribed) */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Notification Filters &amp; Coverage</span>
          </div>

          {/* Country Code & Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Country Code (ISO 2-letter)
              </label>
              <input
                type="text"
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="e.g. IN, US, DE"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-750 rounded-xl text-xs text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Coordinate Proximity Radius
              </label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={100}>Within 100 km</option>
                <option value={300}>Within 300 km</option>
                <option value={500}>Within 500 km</option>
                <option value={1000}>Within 1,000 km</option>
              </select>
            </div>
          </div>

          {/* Alert Categories */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Alert Categories
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-850/60 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("OFFICIAL_CAP_WARNING")}
                  onChange={() => toggleCategory("OFFICIAL_CAP_WARNING")}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white">Official CAP Severe Warnings</span>
                  <p className="text-[10px] text-slate-400">
                    National meteorological bulletins (WMO SWIC / Member States)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-850/60 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("GDACS_DISASTER_ALERT")}
                  onChange={() => toggleCategory("GDACS_DISASTER_ALERT")}
                  className="rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white">GDACS Multi-Hazard Disasters</span>
                  <p className="text-[10px] text-slate-400">
                    Tropical cyclones, major floods, earthquakes (UN OCHA / EC)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Minimum Severity */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Minimum Severity Threshold
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Moderate", "Severe", "Extreme"] as AlertSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setMinSeverity(sev)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    minSeverity === sev
                      ? "bg-blue-600/30 border-blue-500 text-blue-200"
                      : "bg-slate-800 border-slate-750 text-slate-400 hover:text-white"
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
                disabled={loading}
                className="w-full sm:flex-1 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Save Preferences
              </button>

              <button
                onClick={handleSendDiagnosticTest}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                title="Send technical diagnostic test notification with no weather claims"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Web Push</span>
              </button>
            </div>
          )}

          {testStatus && (
            <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
              {testStatus}
            </p>
          )}
        </div>

        {/* Data Integrity & Privacy Guarantee Notice */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">Privacy &amp; Data Integrity Invariants:</strong> Subscriptions are possession-bound via private tokens. We never store personal identities or precise continuous geolocation. Push alerts are dispatched strictly upon genuine active bulletins from WMO CAP &amp; GDACS; zero notifications will be simulated or fabricated.
          </span>
        </div>
      </div>
    </div>
  );
};
