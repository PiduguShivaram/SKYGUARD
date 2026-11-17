"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ExternalLink,
  Info,
  Key,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { OfficialAlertResponse } from "@/types";

interface OfficialAlertsCardProps {
  alertsData: OfficialAlertResponse | null;
  loading: boolean;
}

export const OfficialAlertsCard: React.FC<OfficialAlertsCardProps> = ({ alertsData, loading }) => {
  const [showInstructions, setShowInstructions] = useState(false);

  if (loading) {
    return (
      <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-3"></div>
        <div className="h-16 bg-slate-700/50 rounded-xl"></div>
      </div>
    );
  }

  if (!alertsData) return null;

  const isConnected = alertsData.provider_status === "CONNECTED";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-850 to-slate-900 border border-slate-700/90 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Authoritative Emergency Warnings
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isConnected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {alertsData.provider_status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Agency: {alertsData.official_agency}
            </p>
          </div>
        </div>

        {/* Quick Portal Links */}
        <div className="flex items-center gap-2">
          <a
            href={alertsData.official_portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>IMD Mausam</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={alertsData.ndma_sachet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>NDMA SACHET</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Connected State with Active Alerts */}
      {isConnected && alertsData.active_alerts.length > 0 && (
        <div className="mt-4 space-y-3">
          {alertsData.active_alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-slate-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500 text-white">
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-400">Valid until: {alert.expires}</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-2">{alert.headline}</h4>
              <p className="text-xs text-slate-300 mt-1">{alert.area_description}</p>
              {alert.instruction && (
                <div className="mt-2 p-2 bg-slate-900/60 rounded-lg text-xs text-amber-200 font-medium">
                  Precaution: {alert.instruction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Connected State with No Active Alerts */}
      {isConnected && alertsData.active_alerts.length === 0 && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">No Active Official Warnings</p>
            <p className="text-xs text-slate-300">
              IMD reporting normal atmospheric conditions for this district.
            </p>
          </div>
        </div>
      )}

      {/* Disconnected / Unauthenticated State */}
      {!isConnected && (
        <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-slate-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-300">
                Official Alert Provider: Connection Offline / Unauthenticated
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {alertsData.unavailability_reason ||
                  "Real-time IMD district warning API credentials are not provisioned in the server environment."}
              </p>
              <div className="mt-2.5 p-2.5 bg-slate-900/80 rounded-lg border border-slate-700/80 text-[11px] text-amber-200/90 leading-normal flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Integrity Invariant:</strong> SkyGuard does NOT interpret the absence of an API connection as &quot;Safe&quot; or &quot;No Warnings&quot;. Always verify active severe-weather bulletins on the official IMD Mausam or NDMA SACHET portals linked above.
                </span>
              </div>

              {/* Expandable Setup Instructions */}
              {alertsData.setup_instructions && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>How to configure official IMD API credentials</span>
                    {showInstructions ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showInstructions && (
                    <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-700 text-xs text-slate-300 font-mono whitespace-pre-line">
                      {alertsData.setup_instructions}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
