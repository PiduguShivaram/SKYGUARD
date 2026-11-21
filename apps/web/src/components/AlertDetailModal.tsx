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
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  const isDescRedundant =
    alert &&
    (!alert.description ||
      alert.description.trim().toLowerCase() === alert.headline.trim().toLowerCase() ||
      alert.description.trim().toLowerCase() === alert.event.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#0e1628] to-[#080d1a] border border-white/[0.12] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-2xl border border-rose-500/30 mt-0.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${alert ? getSeverityBadgeClass(alert.severity) : ""}`}>
                  {alert?.severity || "Active Alert"}
                </span>

                {alert?.local_color_code && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/30">
                    {alert.local_color_code}
                  </span>
                )}

                {alert?.msg_type === "Cancel" && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    CANCELLED
                  </span>
                )}

                <span className="text-[11px] font-medium text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.08]">
                  {alert?.source_provider || "Authoritative Provider"}
                </span>

                {alert?.language && (
                  <span className="text-[10px] font-mono uppercase text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
                    {alert.language}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-white mt-2 leading-snug">
                {alert?.headline || "Loading Alert Details..."}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2 animate-pulse">
            <p>Retrieving authentic bulletin record...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {alert && !loading && (
          <div className="space-y-4 text-xs">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-850/60 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <Building className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong className="text-slate-400">Issuer:</strong> {alert.issuer}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong className="text-slate-400">Area:</strong> {alert.affected_area}
                  {alert.country_code ? ` [${alert.country_code}]` : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong className="text-slate-400">Urgency / Certainty:</strong> {alert.urgency || "Unknown"} / {alert.certainty || "Unknown"}
                </span>
              </div>

              {alert.effective_time && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    <strong className="text-slate-400">Issued:</strong> {alert.effective_time}
                  </span>
                </div>
              )}

              {alert.expires_time && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    <strong className="text-slate-400">Expires:</strong> {alert.expires_time}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Advisory Bulletin
              </h4>
              <div className="p-4 rounded-xl bg-slate-850/40 border border-slate-800 text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                {isDescRedundant ? (
                  <p className="italic text-slate-400">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                <span>View Raw Provider Bulletin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-colors font-medium"
              >
                Close
              </button>
            </div>

            {/* Zero-Fabrication Transparency Notice */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Bulletin retrieved verbatim from authoritative international feeds ({alert.source_provider}). SkyGuard enforces absolute data integrity: alerts are never seeded or synthesized.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
