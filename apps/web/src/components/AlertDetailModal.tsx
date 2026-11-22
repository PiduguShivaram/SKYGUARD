"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ExternalLink,
  X,
  Clock,
  MapPin,
  Building,
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

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!alertId) return null;

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "extreme":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "severe":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "moderate":
        return "bg-blue-600/20 text-blue-300 border-blue-500/30";
      case "minor":
        return "bg-surface-elevated text-text-muted border-border-subtle";
      default:
        return "bg-surface-elevated text-text-muted border-border-subtle";
    }
  };

  const isDescRedundant =
    alert &&
    (!alert.description ||
      alert.description.trim().toLowerCase() === alert.headline.trim().toLowerCase() ||
      alert.description.trim().toLowerCase() === alert.event.trim().toLowerCase());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="surface-panel rounded-sg max-w-xl w-full p-6 shadow-dialog space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-border-subtle">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500/15 text-rose-400 rounded-sg shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-sg border ${alert ? getSeverityBadgeClass(alert.severity) : ""}`}>
                  {alert?.severity || "Active Alert"}
                </span>

                {alert?.msg_type === "Cancel" && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    CANCELLED
                  </span>
                )}

                <span className="text-[11px] text-text-muted bg-surface-base px-2 py-0.5 rounded-sg border border-border-subtle">
                  {alert?.source_provider || "Authoritative Provider"}
                </span>
              </div>

              <h3 id="modal-headline" className="text-base font-semibold text-white mt-1.5 leading-snug">
                {alert?.headline || "Loading Alert Details..."}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-white rounded-sg hover:bg-surface-elevated transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-xs text-text-muted space-y-2 animate-pulse">
            <p>Retrieving authentic bulletin record...</p>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-sg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {alert && !loading && (
          <div className="space-y-4 text-xs">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-sg bg-surface-base border border-border-subtle">
              <div className="flex items-center gap-2 text-text-primary">
                <Building className="w-4 h-4 text-text-muted shrink-0" />
                <span>
                  <strong className="text-text-muted font-medium">Issuer:</strong> {alert.issuer}
                </span>
              </div>

              <div className="flex items-center gap-2 text-text-primary">
                <MapPin className="w-4 h-4 text-text-muted shrink-0" />
                <span>
                  <strong className="text-text-muted font-medium">Area:</strong> {alert.affected_area}
                  {alert.country_code ? ` [${alert.country_code}]` : ""}
                </span>
              </div>

              <div className="flex items-center gap-2 text-text-primary">
                <Tag className="w-4 h-4 text-text-muted shrink-0" />
                <span>
                  <strong className="text-text-muted font-medium">Urgency / Certainty:</strong> {alert.urgency || "Unknown"} / {alert.certainty || "Unknown"}
                </span>
              </div>

              {alert.effective_time && (
                <div className="flex items-center gap-2 text-text-primary">
                  <Clock className="w-4 h-4 text-text-muted shrink-0" />
                  <span>
                    <strong className="text-text-muted font-medium">Issued:</strong> {alert.effective_time}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-1">
                Official Advisory Bulletin
              </h4>
              <div className="p-3.5 rounded-sg bg-surface-base border border-border-subtle text-text-primary leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap text-xs">
                {isDescRedundant ? (
                  <p className="text-text-muted italic">
                    Official bulletin headline conveys full scope: {alert.headline}
                  </p>
                ) : (
                  alert.description
                )}
              </div>
            </div>

            {/* Official Source Link & Close */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={alert.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-brand-fill hover:bg-brand-hover text-white font-medium rounded-sg transition-colors text-xs min-h-[44px]"
              >
                <span>View Raw Provider Bulletin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-base text-text-primary hover:text-white rounded-sg transition-colors font-medium text-xs border border-border-subtle min-h-[44px]"
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
