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
      <div className="surface-panel p-6 animate-pulse">
        <div className="h-4 bg-[#1A1F2C] rounded-sg w-1/3 mb-3"></div>
        <div className="h-16 bg-[#1A1F2C]/60 rounded-sg"></div>
      </div>
    );
  }

  if (!alertsData) return null;

  const isConnected = alertsData.provider_status === "CONNECTED";

  return (
    <div className="surface-panel p-6 shadow-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#2A3141]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-sg bg-[#F87171]/15 border border-[#DC2626]/30 text-[#F87171]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#E8EDF4] tracking-tight">
                Authoritative Emergency Warnings
              </h3>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sg uppercase tracking-wider ${
                  isConnected
                    ? "bg-[#0A1710] text-[#34D399] border border-[#059669]/40"
                    : "bg-[#1C1507] text-[#FCD34D] border border-[#D97706]/40"
                }`}
              >
                {alertsData.provider_status}
              </span>
            </div>
            <p className="text-xs text-[#8B95A8]">
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
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-sg bg-[#0C0F14] hover:bg-[#1A1F2C] border border-[#2A3141] text-xs font-medium text-[#60A5FA] hover:text-[#E8EDF4] transition-colors min-h-[36px]"
          >
            <span>IMD Mausam</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={alertsData.ndma_sachet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-sg bg-[#0C0F14] hover:bg-[#1A1F2C] border border-[#2A3141] text-xs font-medium text-[#34D399] hover:text-[#E8EDF4] transition-colors min-h-[36px]"
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
              className="p-4 rounded-sg border-l-4 border-l-[#DC2626] border-y border-r border-[#2A3141] bg-[#1F0E0E] text-[#E8EDF4]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sg bg-[#DC2626]/20 text-[#F87171] border border-[#DC2626]/40 uppercase">
                  {alert.severity}
                </span>
                <span className="text-xs font-mono text-[#8B95A8]">Valid until: {alert.expires}</span>
              </div>
              <h4 className="text-sm font-bold text-[#E8EDF4] mt-2">{alert.headline}</h4>
              <p className="text-xs text-[#8B95A8] mt-1">{alert.area_description}</p>
              {alert.instruction && (
                <div className="mt-2 p-2 bg-[#0C0F14] rounded-sg border border-[#2A3141] text-xs text-[#FCD34D] font-medium">
                  Precaution: {alert.instruction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Connected State with No Active Alerts */}
      {isConnected && alertsData.active_alerts.length === 0 && (
        <div className="mt-4 p-4 rounded-sg border-l-4 border-l-[#059669] border-y border-r border-[#2A3141] bg-[#0A1710] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#34D399] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#E8EDF4]">No Active Official Warnings</p>
            <p className="text-xs text-[#8B95A8]">
              IMD reporting normal atmospheric conditions for this district.
            </p>
          </div>
        </div>
      )}

      {/* Disconnected / Unauthenticated State */}
      {!isConnected && (
        <div className="mt-4 p-4 rounded-sg border-l-4 border-l-[#D97706] border-y border-r border-[#2A3141] bg-[#1C1507] text-[#E8EDF4]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FCD34D] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#FCD34D]">
                Official Alert Provider: Connection Offline / Unauthenticated
              </h4>
              <p className="text-xs text-[#8B95A8] mt-1 leading-relaxed">
                {alertsData.unavailability_reason ||
                  "Real-time IMD district warning API credentials are not provisioned in the server environment."}
              </p>
              <div className="mt-2.5 p-2.5 bg-[#0C0F14] rounded-sg border border-[#2A3141] text-[11px] text-[#FCD34D] leading-normal flex items-start gap-2">
                <Info className="w-4 h-4 text-[#FCD34D] shrink-0 mt-0.5" />
                <span>
                  <strong>Data Integrity Invariant:</strong> SkyGuard does NOT interpret the absence of an API connection as &quot;Safe&quot; or &quot;No Warnings&quot;. Always verify active severe-weather bulletins on the official IMD Mausam or NDMA SACHET portals linked above.
                </span>
              </div>

              {/* Expandable Setup Instructions */}
              {alertsData.setup_instructions && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center gap-1.5 text-xs text-[#60A5FA] hover:underline font-medium min-h-[36px]"
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
                    <div className="mt-2 p-3 bg-[#0C0F14] rounded-sg border border-[#2A3141] text-xs text-[#8B95A8] font-mono whitespace-pre-line">
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
