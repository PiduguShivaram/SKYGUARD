"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { Header } from "@/components/Header";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { GlobalAlertItem } from "@/types";
import { getApiBase } from "@/lib/api";

export default function AlertDetailPage() {
  const params = useParams();
  const alertId = params?.id as string;

  const [alert, setAlert] = useState<GlobalAlertItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alertId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const API_BASE = getApiBase();
    fetch(`${API_BASE}/api/v1/alerts/${encodeURIComponent(alertId)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(
              "This emergency advisory is expired or no longer active in live authoritative feeds."
            );
          }
          throw new Error(`Failed to retrieve alert details (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((data: GlobalAlertItem) => {
        if (isMounted) {
          setAlert(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [alertId]);

  return (
    <div className="min-h-screen bg-[#0C0F14] text-text-primary flex flex-col justify-between selection:bg-brand-fill selection:text-white">
      <div>
        <Header upstreamStatus={loading ? "CONNECTED" : error ? "DEGRADED" : "HEALTHY"} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-brand-text hover:text-white transition-colors px-3 py-2 rounded-sg bg-surface-panel border border-border-subtle"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Local Weather</span>
            </Link>

            <Link
              href="/disasters"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-white transition-colors px-3 py-2 rounded-sg bg-surface-panel border border-border-subtle"
            >
              <Globe className="w-3.5 h-3.5 text-brand-text" />
              <span>Global Radar</span>
            </Link>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 rounded-sg surface-panel animate-pulse space-y-4">
              <div className="h-4 bg-surface-base rounded-sg w-1/4" />
              <div className="h-8 bg-surface-base rounded-sg w-3/4" />
              <div className="h-24 bg-surface-base rounded-sg" />
            </div>
          )}

          {/* Error / Expired State */}
          {!loading && error && (
            <div className="p-8 rounded-sg surface-panel border border-rose-500/30 text-center space-y-4">
              <div className="inline-flex p-3 rounded-sg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-white">Advisory Inactive or Not Found</h2>
              <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">{error}</p>
              <div className="pt-2">
                <Link
                  href="/disasters"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sg bg-surface-elevated hover:bg-surface-base text-xs font-mono text-brand-text transition-colors min-h-[44px]"
                >
                  <Globe className="w-4 h-4" />
                  <span>Scan Active Worldwide Disasters</span>
                </Link>
              </div>
            </div>
          )}

          {/* Alert Content */}
          {!loading && alert && (
            <div className="rounded-sg surface-panel overflow-hidden shadow-panel border-l-4"
              style={{
                borderLeftColor: alert.severity === "Extreme" ? "#DC2626" : alert.severity === "Severe" ? "#D97706" : "#2563EB",
              }}
            >
              {/* Severity Banner */}
              <div
                className={`p-6 border-b border-border-subtle ${
                  alert.severity === "Extreme"
                    ? "bg-rose-950/20 text-rose-300"
                    : alert.severity === "Severe"
                    ? "bg-amber-950/20 text-amber-300"
                    : "bg-blue-950/20 text-blue-300"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">
                      Official Warning: {alert.source_provider}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-3 py-1 rounded-sg font-bold uppercase tracking-wider ${
                      alert.severity === "Extreme"
                        ? "bg-red-500/20 text-red-200 border border-red-500/40"
                        : alert.severity === "Severe"
                        ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                        : "bg-blue-600/20 text-blue-200 border border-blue-500/40"
                    }`}
                  >
                    {alert.severity} Severity {alert.local_color_code ? `[${alert.local_color_code}]` : ""}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                  {alert.headline || alert.event}
                </h1>
                <p className="text-sm text-text-muted mt-2 font-mono">
                  Issued by: <strong className="text-white">{alert.issuer}</strong>
                </p>
              </div>

              {/* Core Metadata Grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border-subtle bg-surface-base text-xs font-mono">
                <div className="p-3 rounded-sg surface-panel space-y-1">
                  <span className="text-[10px] uppercase text-text-muted flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-brand-text" />
                    <span>Target Area</span>
                  </span>
                  <p className="text-white font-semibold font-sans text-sm">{alert.affected_area}</p>
                  <p className="text-text-muted text-[11px]">Country: {alert.country_code || "Global"}</p>
                </div>

                <div className="p-3 rounded-sg surface-panel space-y-1">
                  <span className="text-[10px] uppercase text-text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Effective Timeline</span>
                  </span>
                  <p className="text-white truncate">
                    From: {alert.effective_time ? new Date(alert.effective_time).toLocaleString() : "Immediate"}
                  </p>
                  <p className="text-text-muted truncate">
                    Until: {alert.expires_time ? new Date(alert.expires_time).toLocaleString() : "Until Cancelled"}
                  </p>
                </div>

                <div className="p-3 rounded-sg surface-panel space-y-1">
                  <span className="text-[10px] uppercase text-text-muted flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CAP Parameters</span>
                  </span>
                  <p className="text-white">Urgency: {alert.urgency || "Expected"}</p>
                  <p className="text-text-muted">Certainty: {alert.certainty || "Observed"}</p>
                </div>
              </div>

              {/* Description & Official Action */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                    Official Advisory Description
                  </h3>
                  <div className="p-4 rounded-sg bg-surface-base border border-border-subtle text-sm text-text-primary leading-relaxed font-sans whitespace-pre-line">
                    {alert.description || alert.headline}
                  </div>
                </div>

                {/* Instruction / Recommended Safety Actions */}
                <div className="p-4 rounded-sg surface-panel border border-border-subtle space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-brand-text font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-brand-text" />
                    <span>Recommended Preventive Actions</span>
                  </h3>
                  <ul className="text-xs text-text-muted space-y-1.5 list-disc list-inside">
                    <li>Secure outdoor structures, loose materials, and agricultural equipment.</li>
                    <li>Avoid unnecessary travel through low-lying areas, waterways, or flooded underpasses.</li>
                    <li>Charge mobile phones and ensure backup battery power for emergency communication.</li>
                    <li>Follow instructions directly issued by local civil protection authorities.</li>
                  </ul>
                </div>

                {/* Provenance & Original Feed Attribution */}
                <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted font-mono">
                  <span>CAP ID: {alert.id}</span>
                  {alert.source_url && (
                    <a
                      href={alert.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-text hover:underline"
                    >
                      <span>Original Upstream Feed Bulletin</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ProvenanceFooter weather={null} />
    </div>
  );
}
