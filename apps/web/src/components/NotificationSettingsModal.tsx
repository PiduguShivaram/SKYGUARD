"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  ShieldCheck,
  X,
  Send,
  Sliders,
  Info,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import {
  AlertCategory,
  AlertSeverity,
  PushPermissionStatus,
} from "@/types";
import {
  getVapidPublicKey,
  subscribePush,
  getPushPreferences,
  updatePushPreferences,
  unsubscribePush,
  sendDiagnosticPushTest,
  sendTelegramTestAlert,
  requestTelegramVerification,
  confirmTelegramVerificationCode,
  getTelegramBotInfo,
} from "@/lib/api";
import { syncUserAlertPreferences } from "@/lib/supabase";

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

  // Telegram Mobile State & Ownership Verification
  const [telegramChatId, setTelegramChatId] = useState<string>("");
  const [telegramVerificationCode, setTelegramVerificationCode] = useState<string>("");
  const [telegramStep, setTelegramStep] = useState<"idle" | "code_sent" | "verified">("idle");
  const [telegramAuthToken, setTelegramAuthToken] = useState<string | null>(null);
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState<boolean>(false);
  const [botInfo, setBotInfo] = useState<{ bot_username: string; bot_url: string; is_configured: boolean } | null>(null);

  const handleRequestTelegramCode = async () => {
    if (!telegramChatId.trim()) return;
    setTelegramLoading(true);
    setTelegramTestStatus("Dispatching 6-digit verification code to your Telegram chat...");
    try {
      await requestTelegramVerification(
        telegramChatId.trim(),
        selectedLocationLabel || "My City",
        selectedLatitude,
        selectedLongitude
      );
      setTelegramStep("code_sent");
      setTelegramTestStatus(`✓ Challenge code sent! Check your Telegram messages in @skyguard_alerts_bot.`);
    } catch (err: any) {
      setTelegramTestStatus(`Failed to send code: ${err.message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleVerifyTelegramCode = async () => {
    if (!telegramChatId.trim() || !telegramVerificationCode.trim()) return;
    setTelegramLoading(true);
    setTelegramTestStatus("Validating challenge code...");
    try {
      const res = await confirmTelegramVerificationCode(
        telegramChatId.trim(),
        telegramVerificationCode.trim(),
        selectedLocationLabel || "My City",
        selectedLatitude,
        selectedLongitude
      );
      setTelegramAuthToken(res.auth_token);
      setTelegramStep("verified");
      localStorage.setItem("skyguard_telegram_chat_id", telegramChatId.trim());
      localStorage.setItem("skyguard_telegram_token", res.auth_token);
      syncUserAlertPreferences({
        min_severity: minSeverity,
        wants_telegram: true,
        telegram_chat_id: telegramChatId.trim(),
        wants_push: isSubscribed,
      }).catch(() => {});
      setTelegramTestStatus(`✓ Mobile device verified & ownership confirmed! Ready for live alerts.`);
    } catch (err: any) {
      setTelegramTestStatus(`Verification failed: ${err.message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSendTelegramTest = async () => {
    if (!telegramChatId.trim()) return;
    setTelegramLoading(true);
    setTelegramTestStatus("Sending diagnostic check to verified device...");
    try {
      const res = await sendTelegramTestAlert(
        telegramChatId.trim(),
        selectedLocationLabel || "My City",
        telegramAuthToken || undefined
      );
      setTelegramTestStatus(`✓ Diagnostic delivered to Telegram! (${res.message})`);
    } catch (err: any) {
      setTelegramTestStatus(`Delivery notice: ${err.message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Load subscription state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isActive = true;

    getTelegramBotInfo()
      .then((info) => {
        if (isActive) setBotInfo(info);
      })
      .catch(() => {});

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false);
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PushPermissionStatus);

    const savedSubId = localStorage.getItem("skyguard_push_sub_id");
    const savedToken = localStorage.getItem("skyguard_push_token");
    const savedTelegramChatId = localStorage.getItem("skyguard_telegram_chat_id");
    const savedTelegramToken = localStorage.getItem("skyguard_telegram_token");

    if (savedTelegramChatId && savedTelegramToken) {
      setTelegramChatId(savedTelegramChatId);
      setTelegramAuthToken(savedTelegramToken);
      setTelegramStep("verified");
    }

    if (savedSubId && savedToken) {
      setSubscriptionId(savedSubId);
      setPossessionToken(savedToken);
      setIsSubscribed(true);
      setLoadingPreferences(true);

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
            localStorage.removeItem("skyguard_push_sub_id");
            localStorage.removeItem("skyguard_push_token");
            setIsSubscribed(false);
          } else {
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

  const handleEnableNotifications = async () => {
    setLoading(true);
    setFeedback(null);
    setTestStatus(null);

    try {
      if (!("Notification" in window)) {
        throw new Error("Push notifications are not supported by this browser.");
      }

      const permResult = await Notification.requestPermission();
      setPermission(permResult as PushPermissionStatus);

      if (permResult !== "granted") {
        throw new Error("Notification permission was denied or dismissed.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidPublicKey = await getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const subJson = pushSubscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Browser returned incomplete push subscription keys.");
      }

      const savedToken = localStorage.getItem("skyguard_push_token") || undefined;

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

  const handleUnsubscribe = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      if (subscriptionId && possessionToken) {
        await unsubscribePush(subscriptionId, possessionToken);
      }

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
      syncUserAlertPreferences({
        min_severity: minSeverity,
        wants_telegram: !!telegramAuthToken,
        telegram_chat_id: telegramChatId.trim() || undefined,
        wants_push: isSubscribed,
      }).catch(() => {});
      setFeedback("Preferences updated and synchronized with SkyGuard server.");
    } catch (err: any) {
      setFeedback(`Failed to update preferences: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="surface-panel rounded-sg max-w-lg w-full p-6 shadow-dialog space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-fill/15 text-brand-text rounded-sg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="push-modal-title" className="text-base font-semibold text-white tracking-tight">
                Global Push Notification Center
              </h3>
              <p className="text-xs text-text-muted">
                Privacy-preserving alerts for official WMO CAP &amp; GDACS disasters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-white rounded-sg hover:bg-surface-elevated transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Phone (Telegram) Direct Alerts */}
        <div className="p-4 rounded-sg bg-surface-base border border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-fill/20 text-brand-text rounded-sg">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Direct Mobile Alerts (Telegram Bot)
                </h4>
                <p className="text-[11px] text-text-muted">
                  Instant push to mobile phones with vibration &amp; sound (100% Free)
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg border ${
                botInfo?.is_configured
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/25"
              }`}
            >
              {botInfo?.is_configured ? "ACTIVE BOT" : "BOT UNCONFIGURED"}
            </span>
          </div>

          <a
            href={botInfo?.bot_url || "https://t.me/skyguard_alerts_bot"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-fill hover:bg-brand-hover text-white rounded-sg text-xs font-semibold transition-all shadow-sm group min-h-[44px]"
          >
            <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span>Connect Phone: @{botInfo?.bot_username || "skyguard_alerts_bot"}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          {/* Verified Mobile Phone Ownership Flow */}
          <div className="pt-2 border-t border-border-subtle space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                {telegramStep === "verified" ? "Verified Mobile Device" : "Link Mobile Device (Proof of Ownership)"}
              </span>
              {telegramStep === "verified" && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sg border border-emerald-500/20">
                  OWNERSHIP CONFIRMED
                </span>
              )}
            </div>

            {telegramStep === "idle" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Enter Telegram Chat ID (e.g. 12345678)"
                    className="flex-1 px-3 py-2 bg-surface-base border border-border-subtle rounded-sg text-xs text-white placeholder:text-text-muted font-mono focus:outline-none focus:ring-1 focus:ring-brand-fill min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={handleRequestTelegramCode}
                    disabled={telegramLoading || !telegramChatId.trim()}
                    className="px-3.5 py-2 bg-brand-fill hover:bg-brand-hover disabled:opacity-50 text-white rounded-sg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 min-h-[44px]"
                  >
                    <span>{telegramLoading ? "Sending..." : "Send Code"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-text-muted">
                  To prevent unauthorized subscriptions, a 6-digit challenge code will be sent to this Telegram chat.
                  Make sure you have opened <strong className="text-white">@{botInfo?.bot_username || "skyguard_alerts_bot"}</strong> and tapped &quot;Start&quot;.
                </p>
              </div>
            )}

            {telegramStep === "code_sent" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={telegramVerificationCode}
                    onChange={(e) => setTelegramVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="flex-1 px-3 py-2 bg-surface-base border border-border-subtle rounded-sg text-xs text-white placeholder:text-text-muted font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-brand-fill min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyTelegramCode}
                    disabled={telegramLoading || telegramVerificationCode.trim().length !== 6}
                    className="px-3.5 py-2 bg-brand-fill hover:bg-brand-hover disabled:opacity-50 text-white rounded-sg text-xs font-medium transition-colors shrink-0 min-h-[44px]"
                  >
                    <span>{telegramLoading ? "Verifying..." : "Confirm Link"}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-text-muted">Target Chat: {telegramChatId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTelegramStep("idle");
                      setTelegramVerificationCode("");
                    }}
                    className="text-brand-text hover:underline"
                  >
                    Change Chat ID
                  </button>
                </div>
              </div>
            )}

            {telegramStep === "verified" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-sg bg-surface-base border border-border-subtle text-xs font-mono">
                  <span className="text-text-primary">Chat ID: {telegramChatId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTelegramStep("idle");
                      setTelegramAuthToken(null);
                      localStorage.removeItem("skyguard_telegram_chat_id");
                      localStorage.removeItem("skyguard_telegram_token");
                    }}
                    className="text-[10px] text-text-muted hover:text-rose-400 transition-colors"
                  >
                    Unlink
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSendTelegramTest}
                  disabled={telegramLoading}
                  className="w-full py-2 bg-surface-elevated hover:bg-surface-base border border-border-subtle disabled:opacity-50 text-white rounded-sg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <span>{telegramLoading ? "Dispatching..." : "Send Verified Diagnostic Buzz to Phone"}</span>
                </button>
              </div>
            )}

            {telegramTestStatus && (
              <p className="text-[11px] text-text-primary bg-surface-base p-2.5 rounded-sg border border-border-subtle font-mono leading-relaxed">
                {telegramTestStatus}
              </p>
            )}
          </div>
        </div>

        {/* Permission & Status Bar */}
        <div className="p-3.5 rounded-sg bg-surface-base border border-border-subtle flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-text-muted tracking-wider">
              Browser Permission
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  permission === "granted"
                    ? "bg-emerald-400"
                    : permission === "denied"
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-semibold text-white capitalize">{permission}</span>
              {isSubscribed && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 ml-1">
                  DEVICE ACTIVE
                </span>
              )}
            </div>
          </div>

          {!isSubscribed ? (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === "denied"}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-fill hover:bg-brand-hover disabled:opacity-50 text-white rounded-sg text-xs font-medium transition-colors min-h-[44px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Notifications</span>
            </button>
          ) : (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-sg text-xs font-medium transition-colors min-h-[44px]"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Disable</span>
            </button>
          )}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-sg text-xs flex items-center gap-2 ${
              feedback.startsWith("Error")
                ? "bg-rose-950/20 text-rose-300 border border-rose-500/30"
                : "bg-emerald-950/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Preferences */}
        <div className="space-y-3.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-brand-text" />
            <span>Notification Filters &amp; Coverage</span>
          </div>

          {/* Country Code & Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">
                Country Code (ISO 2-letter)
              </label>
              <input
                type="text"
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="e.g. IN, US, DE"
                className="w-full px-3 py-2 bg-surface-base border border-border-subtle rounded-sg text-xs text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-brand-fill min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">
                Coordinate Proximity Radius
              </label>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-base border border-border-subtle rounded-sg text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-fill min-h-[44px]"
              >
                <option value={100}>Within 100 km</option>
                <option value={300}>Within 300 km</option>
                <option value={500}>Within 500 km</option>
                <option value={1000}>Within 1,000 km</option>
              </select>
            </div>
          </div>

          {/* Country-Wide Bulletins Toggle */}
          <div className="p-3 rounded-sg bg-surface-base border border-border-subtle space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsCountryWide}
                onChange={(e) => setWantsCountryWide(e.target.checked)}
                className="mt-0.5 rounded-sg text-brand-fill focus:ring-brand-fill bg-surface-base border-border-subtle"
              />
              <div>
                <span className="text-xs font-medium text-white">
                  Receive Country-Wide Emergency Bulletins
                </span>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                  Opt in to receive official national emergency bulletins affecting your entire country even if an alert polygon is outside your immediate coordinates. When disabled, you only receive localized notifications verified within your coordinates.
                </p>
              </div>
            </label>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">
              Alert Categories
            </label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 p-2.5 rounded-sg bg-surface-base border border-border-subtle cursor-pointer hover:bg-surface-elevated transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("OFFICIAL_CAP_WARNING")}
                  onChange={() => toggleCategory("OFFICIAL_CAP_WARNING")}
                  className="rounded-sg text-brand-fill focus:ring-brand-fill bg-surface-base border-border-subtle"
                />
                <div className="text-xs">
                  <span className="font-medium text-white">Official CAP Severe Warnings</span>
                  <p className="text-[10px] text-text-muted">
                    National meteorological bulletins (WMO SWIC / Member States)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-sg bg-surface-base border border-border-subtle cursor-pointer hover:bg-surface-elevated transition-colors">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes("GDACS_DISASTER_ALERT")}
                  onChange={() => toggleCategory("GDACS_DISASTER_ALERT")}
                  className="rounded-sg text-brand-fill focus:ring-brand-fill bg-surface-base border-border-subtle"
                />
                <div className="text-xs">
                  <span className="font-medium text-white">GDACS Multi-Hazard Disasters</span>
                  <p className="text-[10px] text-text-muted">
                    Tropical cyclones, major floods, earthquakes (UN OCHA / EC)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Minimum Severity */}
          <div>
            <label className="block text-[11px] font-medium text-text-muted mb-1">
              Minimum Severity Threshold
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Moderate", "Severe", "Extreme"] as AlertSeverity[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setMinSeverity(sev)}
                  className={`py-2 px-2 rounded-sg text-xs font-medium border transition-colors min-h-[44px] ${
                    minSeverity === sev
                      ? "bg-brand-fill text-white border-brand-fill font-semibold"
                      : "bg-surface-base border-border-subtle text-text-muted hover:text-white"
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
                className="w-full sm:flex-1 py-2.5 bg-brand-fill hover:bg-brand-hover text-white rounded-sg text-xs font-medium transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loadingPreferences ? "Loading Preferences..." : "Save Preferences"}
              </button>

              <button
                onClick={handleSendDiagnosticTest}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 bg-surface-elevated hover:bg-surface-base text-text-primary border border-border-subtle rounded-sg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                title="Send technical diagnostic test notification with no weather claims"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Web Push</span>
              </button>
            </div>
          )}

          {testStatus && (
            <p className="text-[11px] text-text-primary bg-surface-base p-2.5 rounded-sg border border-border-subtle font-mono">
              {testStatus}
            </p>
          )}
        </div>

        {/* Data Integrity & Privacy Guarantee Notice */}
        <div className="p-3 rounded-sg bg-surface-base border border-border-subtle text-[11px] text-text-muted leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Privacy &amp; Data Integrity Invariants:</strong> Subscriptions are possession-bound via private tokens. We never store personal identities or precise continuous geolocation. Push alerts are dispatched strictly upon genuine active bulletins from WMO CAP &amp; GDACS; zero notifications will be simulated or fabricated.
          </span>
        </div>
      </div>
    </div>
  );
};
