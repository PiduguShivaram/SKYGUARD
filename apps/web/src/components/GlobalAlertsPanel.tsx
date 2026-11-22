"use client";

import React, { useState } from "react";
import {
  Globe2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Flame,
  Waves,
  Activity,
  Wind,
  Info,
  Filter,
  RefreshCw,
  Bell,
  Eye,
} from "lucide-react";
import { GlobalAlertItem, GlobalAlertsResponse } from "@/types";

interface GlobalAlertsPanelProps {
  alertsData: GlobalAlertsResponse | null;
  loading: boolean;
  onRefresh: () => void;
  selectedCountry?: string;
  selectedLabel?: string;
  isFiltered: boolean;
  onToggleFilter: () => void;
  onSelectAlert?: (alert: GlobalAlertItem) => void;
  onOpenNotifications?: () => void;
}

export const GlobalAlertsPanel: React.FC<GlobalAlertsPanelProps> = ({
  alertsData,
  loading,
  onRefresh,
  selectedCountry,
  selectedLabel,
  isFiltered,
  onToggleFilter,
  onSelectAlert,
  onOpenNotifications,
}) => {
  const [activeTab, setActiveTab] = useState<"official" | "gdacs">("official");

  if (loading && !alertsData) {
    return (
      <div className="surface-panel p-6 shadow-card animate-pulse space-y-3">
        <div className="h-5 bg-[#1A1F2C] rounded-sg w-1/4"></div>
        <div className="h-24 bg-[#1A1F2C]/60 rounded-sg"></div>
      </div>
    );
  }

  if (!alertsData) return null;

  const providers = alertsData.providers_health || {};
  const officialWarnings = alertsData.official_cap_warnings || [];
  const disasterAlerts = alertsData.gdacs_disaster_alerts || [];
  const worldwideOfficialTotal = alertsData.total_worldwide_official_warnings || 0;
  const worldwideDisastersTotal = alertsData.total_worldwide_disasters || 0;

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "extreme":
        return "bg-[#DC2626]/20 text-[#F87171] border border-[#DC2626]/40";
      case "severe":
        return "bg-[#EA580C]/20 text-[#FB923C] border border-[#EA580C]/40";
      case "moderate":
        return "bg-[#D97706]/20 text-[#FCD34D] border border-[#D97706]/40";
      case "minor":
        return "bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40";
      default:
        return "bg-[#1A1F2C] text-[#8B95A8] border border-[#2A3141]";
    }
  };

  const renderGeographicBadge = (status?: string) => {
    switch (status) {
      case "POLYGON_VERIFIED":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-[#0A1710] text-[#34D399] border border-[#059669]/40"
            title="Boundary verified against official source polygon"
          >
            Polygon Verified
          </span>
        );
      case "COORDINATE_POINT":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-[#2563EB]/15 text-[#60A5FA] border border-[#2563EB]/30"
            title="Point coordinate provided"
          >
            Point Location
          </span>
        );
      case "TERRITORY_NATIONAL":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-[#1A1F2C] text-[#8B95A8] border border-[#2A3141]"
            title="Country-wide or territorial emergency scope"
          >
            Territory / National
          </span>
        );
      case "LOCATION_UNVERIFIED":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg bg-[#1C1507] text-[#FCD34D] border border-[#D97706]/40"
            title="Precision location unverified"
          >
            Location Unverified
          </span>
        );
      default:
        return null;
    }
  };

  const getDisasterIcon = (event: string) => {
    const ev = event.toLowerCase();
    if (ev.includes("cyclone") || ev.includes("hurricane") || ev.includes("typhoon")) {
      return <Wind className="w-3.5 h-3.5 text-[#60A5FA]" />;
    }
    if (ev.includes("flood")) {
      return <Waves className="w-3.5 h-3.5 text-[#60A5FA]" />;
    }
    if (ev.includes("earthquake")) {
      return <Activity className="w-3.5 h-3.5 text-[#FCD34D]" />;
    }
    if (ev.includes("wildfire") || ev.includes("fire")) {
      return <Flame className="w-3.5 h-3.5 text-[#F87171]" />;
    }
    return <ShieldAlert className="w-3.5 h-3.5 text-[#FB923C]" />;
  };

  return (
    <div className="surface-panel p-6 sm:p-7 shadow-card space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#2A3141]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#E8EDF4] tracking-tight">
              Worldwide Weather &amp; Disaster Alerts
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-sg bg-[#0C0F14] text-[#8B95A8] border border-[#2A3141]">
              WMO CAP · GDACS
            </span>
          </div>
          <p className="text-xs text-[#8B95A8] mt-0.5">
            Official WMO Common Alerting Protocol bulletins and UN OCHA / EC GDACS feeds
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sg text-xs font-medium border transition-colors min-h-[36px] ${
              isFiltered
                ? "bg-[#2563EB]/15 border-[#2563EB]/40 text-[#60A5FA] font-semibold"
                : "bg-[#0C0F14] border-[#2A3141] text-[#8B95A8] hover:text-[#E8EDF4]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              {isFiltered
                ? `Filtered: ${selectedCountry || selectedLabel || "Near Location"}`
                : "Worldwide View"}
            </span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0C0F14] hover:bg-[#1A1F2C] border border-[#2A3141] text-[#8B95A8] hover:text-[#E8EDF4] rounded-sg text-xs font-medium transition-colors min-h-[36px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#60A5FA]" : ""}`} />
            <span>Refresh</span>
          </button>

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB]/15 hover:bg-[#2563EB]/25 border border-[#2563EB]/40 text-[#60A5FA] rounded-sg text-xs font-medium transition-colors min-h-[36px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Push Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* Provider Status Line */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#8B95A8] block">WMO SWIC (Official CAP)</span>
            <span className="font-mono text-[#E8EDF4] text-xs">
              {providers.wmo_swic?.status === "CONNECTED"
                ? `${providers.wmo_swic.total_alerts_fetched.toLocaleString()} active`
                : "Unavailable"}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              providers.wmo_swic?.status === "CONNECTED" ? "bg-[#34D399]" : "bg-[#F87171]"
            }`}
          />
        </div>

        <div className="p-2.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#8B95A8] block">GDACS (UN OCHA / EC)</span>
            <span className="font-mono text-[#E8EDF4] text-xs">
              {providers.gdacs?.status === "CONNECTED"
                ? `${providers.gdacs.total_alerts_fetched.toLocaleString()} active`
                : "Unavailable"}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              providers.gdacs?.status === "CONNECTED" ? "bg-[#34D399]" : "bg-[#F87171]"
            }`}
          />
        </div>

        <div className="p-2.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#8B95A8] block">Aggregated Active Global</span>
            <span className="font-mono text-[#E8EDF4] text-xs">
              {(worldwideOfficialTotal + worldwideDisastersTotal).toLocaleString()} Events
            </span>
          </div>
          <Globe2 className="w-4 h-4 text-[#60A5FA]" />
        </div>
      </div>

      {/* Feed Category Tabs */}
      <div className="flex border-b border-[#2A3141] gap-1">
        <button
          onClick={() => setActiveTab("official")}
          className={`pb-2.5 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 min-h-[40px] ${
            activeTab === "official"
              ? "border-[#2563EB] text-[#60A5FA] font-semibold"
              : "border-transparent text-[#8B95A8] hover:text-[#E8EDF4]"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Official CAP Severe Warnings ({officialWarnings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("gdacs")}
          className={`pb-2.5 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 min-h-[40px] ${
            activeTab === "gdacs"
              ? "border-[#FCD34D] text-[#FCD34D] font-semibold"
              : "border-transparent text-[#8B95A8] hover:text-[#E8EDF4]"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Multi-Hazard Disasters / GDACS ({disasterAlerts.length})</span>
        </button>
      </div>

      {/* Tab 1: Official CAP Severe Warnings */}
      {activeTab === "official" && (
        <div className="space-y-2.5">
          {officialWarnings.length > 0 ? (
            officialWarnings.map((alert) => {
              const isDescRedundant =
                !alert.description ||
                alert.description.trim().toLowerCase() === alert.headline.trim().toLowerCase() ||
                alert.description.trim().toLowerCase() === alert.event.trim().toLowerCase();

              return (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] hover:border-[#38445A] transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg ${getSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>

                      {renderGeographicBadge(alert.geographic_status)}

                      <span className="text-xs font-semibold text-[#E8EDF4]">
                        {alert.event}
                      </span>

                      <span className="text-[11px] text-[#8B95A8]">
                        · {alert.source_provider}
                      </span>

                      {alert.country_code && (
                        <span className="text-[10px] font-mono text-[#8B95A8] bg-[#1A1F2C] px-1.5 py-0.2 rounded-sg border border-[#2A3141]">
                          {alert.country_code}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#7C879B] font-mono">
                      {alert.effective_time ? `Issued: ${alert.effective_time}` : ""}
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-[#E8EDF4] leading-snug">{alert.headline}</h4>

                  {!isDescRedundant && (
                    <p className="text-xs text-[#8B95A8] line-clamp-2 leading-relaxed">{alert.description}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1E2432] text-[11px] text-[#8B95A8]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#7C879B]">Issuer:</span>
                      <span className="text-[#E8EDF4]">{alert.issuer}</span>
                      <span className="text-[#2A3141]">·</span>
                      <span className="text-[#7C879B]">Area:</span>
                      <span className="text-[#E8EDF4]">{alert.affected_area}</span>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {onSelectAlert && (
                        <button
                          onClick={() => onSelectAlert(alert)}
                          className="text-[#60A5FA] hover:underline font-medium text-xs inline-flex items-center gap-1 transition-colors min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Details</span>
                        </button>
                      )}
                      <a
                        href={alert.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#8B95A8] hover:text-[#E8EDF4] transition-colors min-h-[36px]"
                      >
                        <span>Official CAP</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 rounded-sg bg-[#0C0F14] border border-[#2A3141] text-center space-y-1.5">
              <Info className="w-5 h-5 text-[#60A5FA] mx-auto" />
              <p className="text-xs font-medium text-[#E8EDF4]">
                No active official CAP weather warnings match current filter criteria.
              </p>
              <p className="text-[11px] text-[#7C879B] max-w-md mx-auto">
                {isFiltered
                  ? `There are currently no active WMO SWIC or Alert-Hub bulletins reported for ${selectedCountry || selectedLabel || "this area"}.`
                  : "No official CAP warnings available."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: GDACS Multi-Hazard Disaster Alerts */}
      {activeTab === "gdacs" && (
        <div className="space-y-2.5">
          {disasterAlerts.length > 0 ? (
            disasterAlerts.map((disaster) => {
              const isDescRedundant =
                !disaster.description ||
                disaster.description.trim().toLowerCase() === disaster.headline.trim().toLowerCase() ||
                disaster.description.trim().toLowerCase() === disaster.event.trim().toLowerCase();

              return (
                <div
                  key={disaster.id}
                  className="p-3.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] hover:border-[#38445A] transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1 rounded-sg bg-[#1A1F2C]">
                        {getDisasterIcon(disaster.event)}
                      </div>
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-sg ${getSeverityBadgeClass(disaster.severity)}`}>
                        {disaster.severity}
                      </span>
                      {renderGeographicBadge(disaster.geographic_status)}
                      <span className="text-xs font-semibold text-[#E8EDF4]">{disaster.event}</span>
                      {disaster.country_code && (
                        <span className="text-[10px] font-mono text-[#8B95A8]">
                          ({disaster.country_code})
                        </span>
                      )}
                    </div>

                    {disaster.distance_km !== undefined && disaster.distance_km !== null && (
                      <span className="text-[11px] font-mono text-[#FCD34D]">
                        ~{Math.round(disaster.distance_km).toLocaleString()} km away
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-[#E8EDF4] leading-snug">{disaster.headline}</h4>

                  {!isDescRedundant && (
                    <p className="text-xs text-[#8B95A8] line-clamp-2 leading-relaxed">{disaster.description}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1E2432] text-[11px] text-[#8B95A8]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#7C879B]">Location:</span>
                      <span className="text-[#E8EDF4]">{disaster.affected_area}</span>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {onSelectAlert && (
                        <button
                          onClick={() => onSelectAlert(disaster)}
                          className="text-[#FCD34D] hover:underline font-medium text-xs inline-flex items-center gap-1 transition-colors min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Details</span>
                        </button>
                      )}
                      <a
                        href={disaster.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#8B95A8] hover:text-[#E8EDF4] transition-colors min-h-[36px]"
                      >
                        <span>GDACS Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 rounded-sg bg-[#0C0F14] border border-[#2A3141] text-center space-y-1.5">
              <Info className="w-5 h-5 text-[#FCD34D] mx-auto" />
              <p className="text-xs font-medium text-[#E8EDF4]">
                No active GDACS multi-hazard disaster events in this spatial radius.
              </p>
              <p className="text-[11px] text-[#7C879B] max-w-md mx-auto">
                No major tropical cyclones, widespread floods, or earthquakes detected within search boundaries.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transparent Limitation Notice */}
      <div className="p-3.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] text-[11px] text-[#8B95A8] leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#E8EDF4] font-medium">Notice on Emergency Bulletins:</strong> SkyGuard operates under strict zero-fabrication rules. An empty alert list for any location does <strong>NOT</strong> mean &quot;All Clear&quot; or &quot;No Danger&quot;. Not all domestic agencies publish active CAP feeds to international aggregators. For emergency directives in your territory, always verify official civil defense and national meteorological channels.
        </div>
      </div>
    </div>
  );
};
