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
      <div className="surface-panel p-6 shadow-sm animate-pulse space-y-3">
        <div className="h-5 bg-[#212630] rounded w-1/4"></div>
        <div className="h-24 bg-[#1a1f29] rounded"></div>
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
        return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
      case "severe":
        return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
      case "moderate":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
      case "minor":
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border border-zinc-700";
    }
  };

  const renderGeographicBadge = (status?: string) => {
    switch (status) {
      case "POLYGON_VERIFIED":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
            title="Boundary verified against official source polygon"
          >
            Polygon Verified
          </span>
        );
      case "COORDINATE_POINT":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25"
            title="Point coordinate provided"
          >
            Point Location
          </span>
        );
      case "TERRITORY_NATIONAL":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25"
            title="Country-wide or territorial emergency scope"
          >
            Territory / National
          </span>
        );
      case "LOCATION_UNVERIFIED":
        return (
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25"
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
      return <Wind className="w-3.5 h-3.5 text-blue-400" />;
    }
    if (ev.includes("flood")) {
      return <Waves className="w-3.5 h-3.5 text-blue-400" />;
    }
    if (ev.includes("earthquake")) {
      return <Activity className="w-3.5 h-3.5 text-amber-400" />;
    }
    if (ev.includes("wildfire") || ev.includes("fire")) {
      return <Flame className="w-3.5 h-3.5 text-rose-400" />;
    }
    return <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />;
  };

  return (
    <div className="surface-panel p-6 sm:p-7 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#262c36]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight">
              Worldwide Weather &amp; Disaster Alerts
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#11141a] text-zinc-400 border border-[#212630]">
              WMO CAP · GDACS
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Official WMO Common Alerting Protocol bulletins and UN OCHA / EC GDACS feeds
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              isFiltered
                ? "bg-blue-600/15 border-blue-500/35 text-blue-300 font-semibold"
                : "bg-[#11141a] border-[#212630] text-zinc-300 hover:text-white"
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#11141a] hover:bg-[#1f242c] border border-[#212630] text-zinc-300 hover:text-white rounded-md text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Refresh</span>
          </button>

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/35 text-blue-300 rounded-md text-xs font-medium transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Push Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* Provider Status Line */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-[#11141a] border border-[#212630] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-zinc-400 block">WMO SWIC (Official CAP)</span>
            <span className="font-mono text-zinc-200 text-xs">
              {providers.wmo_swic?.status === "CONNECTED"
                ? `${providers.wmo_swic.total_alerts_fetched.toLocaleString()} active`
                : "Unavailable"}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              providers.wmo_swic?.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
        </div>

        <div className="p-2.5 rounded-lg bg-[#11141a] border border-[#212630] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-zinc-400 block">GDACS (UN OCHA / EC)</span>
            <span className="font-mono text-zinc-200 text-xs">
              {providers.gdacs?.status === "CONNECTED"
                ? `${providers.gdacs.total_alerts_fetched.toLocaleString()} active`
                : "Unavailable"}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              providers.gdacs?.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
        </div>

        <div className="p-2.5 rounded-lg bg-[#11141a] border border-[#212630] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-zinc-400 block">Alert-Hub.org Stream</span>
            <span className="font-mono text-zinc-200 text-xs">
              {providers.alert_hub?.status === "CONNECTED"
                ? `${providers.alert_hub.total_alerts_fetched.toLocaleString()} feeds`
                : "Unavailable"}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              providers.alert_hub?.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262c36]">
        <button
          onClick={() => setActiveTab("official")}
          className={`pb-2.5 px-3 text-xs font-medium transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "official"
              ? "border-blue-500 text-blue-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Official CAP Severe Warnings ({officialWarnings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("gdacs")}
          className={`pb-2.5 px-3 text-xs font-medium transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "gdacs"
              ? "border-amber-500 text-amber-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Multi-Hazard Disasters — GDACS ({disasterAlerts.length})</span>
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
                  className="p-3.5 rounded-lg bg-[#11141a] border border-[#212630] hover:border-[#3b4352] transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${getSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>

                      {renderGeographicBadge(alert.geographic_status)}

                      <span className="text-xs font-semibold text-white">
                        {alert.event}
                      </span>

                      <span className="text-[11px] text-zinc-400">
                        · {alert.source_provider}
                      </span>

                      {alert.country_code && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-[#1f242c] px-1.5 py-0.2 rounded border border-[#2d3441]">
                          {alert.country_code}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-500 font-mono">
                      {alert.effective_time ? `Issued: ${alert.effective_time}` : ""}
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-white leading-snug">{alert.headline}</h4>

                  {!isDescRedundant && (
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{alert.description}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1a1f29] text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-500">Issuer:</span>
                      <span className="text-zinc-300">{alert.issuer}</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">Area:</span>
                      <span className="text-zinc-300">{alert.affected_area}</span>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {onSelectAlert && (
                        <button
                          onClick={() => onSelectAlert(alert)}
                          className="text-blue-400 hover:text-blue-300 font-medium text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Details</span>
                        </button>
                      )}
                      <a
                        href={alert.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
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
            <div className="p-6 rounded-lg bg-[#11141a] border border-[#212630] text-center space-y-1.5">
              <Info className="w-5 h-5 text-blue-400 mx-auto" />
              <p className="text-xs font-medium text-zinc-300">
                No active official CAP weather warnings match current filter criteria.
              </p>
              <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
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
                  className="p-3.5 rounded-lg bg-[#11141a] border border-[#212630] hover:border-[#3b4352] transition-colors space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1 rounded bg-[#1f242c]">
                        {getDisasterIcon(disaster.event)}
                      </div>
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${getSeverityBadgeClass(disaster.severity)}`}>
                        {disaster.severity}
                      </span>
                      {renderGeographicBadge(disaster.geographic_status)}
                      <span className="text-xs font-semibold text-white">{disaster.event}</span>
                      {disaster.country_code && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          ({disaster.country_code})
                        </span>
                      )}
                    </div>

                    {disaster.distance_km !== undefined && disaster.distance_km !== null && (
                      <span className="text-[11px] font-mono text-amber-300">
                        ~{Math.round(disaster.distance_km).toLocaleString()} km away
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-white leading-snug">{disaster.headline}</h4>

                  {!isDescRedundant && (
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{disaster.description}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1a1f29] text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Location:</span>
                      <span className="text-zinc-300">{disaster.affected_area}</span>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {onSelectAlert && (
                        <button
                          onClick={() => onSelectAlert(disaster)}
                          className="text-amber-400 hover:text-amber-300 font-medium text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Details</span>
                        </button>
                      )}
                      <a
                        href={disaster.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
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
            <div className="p-6 rounded-lg bg-[#11141a] border border-[#212630] text-center space-y-1.5">
              <Info className="w-5 h-5 text-amber-400 mx-auto" />
              <p className="text-xs font-medium text-zinc-300">
                No active GDACS multi-hazard disaster events in this spatial radius.
              </p>
              <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                No major tropical cyclones, widespread floods, or earthquakes detected within search boundaries.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transparent Limitation Notice */}
      <div className="p-3.5 rounded-lg bg-[#11141a] border border-[#212630] text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-200 font-medium">Notice on Emergency Bulletins:</strong> SkyGuard operates under strict zero-fabrication rules. An empty alert list for any location does <strong>NOT</strong> mean &quot;All Clear&quot; or &quot;No Danger&quot;. Not all domestic agencies publish active CAP feeds to international aggregators. For emergency directives in your territory, always verify official civil defense and national meteorological channels.
        </div>
      </div>
    </div>
  );
};
