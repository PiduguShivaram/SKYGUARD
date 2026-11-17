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
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${alert ? getSeverityBadgeClass(alert.severity) : ""}`}>
                  {alert?.severity || "Active Alert"}
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-850 px-2 py-0.5 rounded border border-slate-800">
                  {alert?.source_provider || "Authoritative Provider"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                {alert?.headline || "Loading Alert Details..."}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
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
                Official Advisory Description
              </h4>
              <div className="p-4 rounded-xl bg-slate-850/40 border border-slate-800 text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                {alert.description}
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
