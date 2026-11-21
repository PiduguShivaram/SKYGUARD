"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ExternalLink,
  X,
  Clock,
  MapPin,
  Building,
  Info,
  Activity,
  AlertTriangle,
  Globe,
  Tag,
} from "lucide-react";
import { GlobalAlertItem } from "@/types";
import { getAlertDetail } from "@/lib/api";

interface AlertDetailModalProps {
  alertId: string | null;
  onClose: () => void;
  preloadedAlert?: GlobalAlertItem | null;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alertId,
  onClose,
  preloadedAlert,
}) => {
  const [alert, setAlert] = useState<GlobalAlertItem | null>(preloadedAlert || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alertId) return;
    if (preloadedAlert && preloadedAlert.id === alertId) {
      setAlert(preloadedAlert);
      return;
    }

    setLoading(true);
    setError(null);
    getAlertDetail(alertId)
      .then((data) => setAlert(data))
      .catch((err) => {
        console.error("Alert detail error:", err);
        setError("Failed to load alert details or alert has expired.");
      })
      .finally(() => setLoading(false));
  }, [alertId, preloadedAlert]);

  if (!alertId) return null;

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "extreme":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "severe":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "moderate":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "minor":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      default:
        return "bg-zinc-700/30 text-zinc-300 border-zinc-600/40";
    }
  };

  const isDescRedundant =
    alert &&
    (!alert.description ||
      alert.description.trim().toLowerCase() === alert.headline.trim().toLowerCase() ||
      alert.description.trim().toLowerCase() === alert.event.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#11141b] border border-[#202532] rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#1c212d]">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/30 mt-0.5 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${alert ? getSeverityBadgeClass(alert.severity) : ""}`}>
                  {alert?.severity || "Active Alert"}
                </span>

                {alert?.local_color_code && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/30">
                    {alert.local_color_code}
                  </span>
                )}

                {alert?.msg_type === "Cancel" && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    CANCELLED
                  </span>
                )}

                <span className="text-[11px] font-medium text-zinc-400 bg-[#161a24] px-2 py-0.5 rounded border border-[#232938]">
                  {alert?.source_provider || "Authoritative Provider"}
                </span>

                {alert?.language && (
                  <span className="text-[10px] font-mono uppercase text-zinc-400 bg-[#161a24] px-1.5 py-0.5 rounded border border-[#232938]">
                    {alert.language}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white mt-2 leading-snug font-sans">
                {alert?.headline || "Loading Alert Details..."}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center text-xs text-zinc-400 space-y-2 animate-pulse font-mono">
            <p>Retrieving authentic bulletin record...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {alert && !loading && (
          <div className="space-y-4 text-xs font-mono">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330]">
              <div className="flex items-center gap-2 text-zinc-300">
                <Building className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>
                  <strong className="text-zinc-400">Issuer:</strong> {alert.issuer}
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>
                  <strong className="text-zinc-400">Area:</strong> {alert.affected_area}
                  {alert.country_code ? ` [${alert.country_code}]` : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <Tag className="w-4 h-4 text-zinc-500 shrink-0" />
                <span>
                  <strong className="text-zinc-400">Urgency / Certainty:</strong> {alert.urgency || "Unknown"} / {alert.certainty || "Unknown"}
                </span>
              </div>

              {alert.effective_time && (
                <div className="flex items-center gap-2 text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>
                    <strong className="text-zinc-400">Issued:</strong> {alert.effective_time}
                  </span>
                </div>
              )}

              {alert.expires_time && (
                <div className="flex items-center gap-2 text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>
                    <strong className="text-zinc-400">Expires:</strong> {alert.expires_time}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-sans">
                Official Advisory Bulletin
              </h4>
              <div className="p-4 rounded-xl bg-[#0c0e13] border border-[#1e2330] text-zinc-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap font-mono">
                {isDescRedundant ? (
                  <p className="italic text-zinc-400">
                    Official bulletin headline conveys full scope: {alert.headline}
                  </p>
                ) : (
                  alert.description
                )}
              </div>
            </div>

            {/* Official Source Link */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={alert.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-lg transition-colors shadow-sm font-sans"
              >
                <span>View Raw Provider Bulletin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#171b24] hover:bg-[#202633] text-zinc-300 hover:text-white rounded-lg transition-colors font-medium border border-[#242b3a]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
