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
  ChevronRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Bell,
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
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl animate-pulse space-y-4">
        <div className="h-5 bg-slate-800 rounded w-1/3"></div>
        <div className="h-10 bg-slate-800 rounded w-full"></div>
        <div className="h-32 bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  if (!alertsData) return null;

  const providers = alertsData.providers_health || {};
  const officialWarnings = alertsData.official_cap_warnings || [];
  const disasterAlerts = alertsData.gdacs_disaster_alerts || [];

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "extreme":
        return "bg-rose-500/20 text-rose-300 border border-rose-500/40";
      case "severe":
        return "bg-orange-500/20 text-orange-300 border border-orange-500/40";
      case "moderate":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
      default:
        return "bg-blue-500/20 text-blue-300 border border-blue-500/40";
    }
  };

  const getDisasterIcon = (event: string) => {
    const ev = event.toLowerCase();
    if (ev.includes("cyclone") || ev.includes("hurricane") || ev.includes("typhoon")) {
      return <Wind className="w-5 h-5 text-sky-400" />;
    }
    if (ev.includes("flood")) {
      return <Waves className="w-5 h-5 text-blue-400" />;
    }
    if (ev.includes("earthquake")) {
      return <Activity className="w-5 h-5 text-amber-400" />;
    }
    if (ev.includes("wildfire") || ev.includes("fire")) {
      return <Flame className="w-5 h-5 text-rose-400" />;
    }
    return <ShieldAlert className="w-5 h-5 text-orange-400" />;
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Worldwide Weather &amp; Disaster Alerts
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GLOBAL CAP · GDACS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official WMO Common Alerting Protocol warnings &amp; UN OCHA / European Commission disaster feeds
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle between Local/Country filter and Worldwide */}
          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isFiltered
                ? "bg-blue-600/30 border-blue-500 text-blue-200"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title="Toggle geographic filtering"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isFiltered ? `Filtered: ${selectedCountry || "Near Location"}` : "Worldwide View (All)"}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Refresh</span>
          </button>

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
              title="Configure Web Push notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Push Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* Provider Health & Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* WMO SWIC */}
        <div className="p-3 bg-slate-850/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              WMO SWIC (Official CAP)
            </span>
            <p className="text-xs font-bold text-white">
              {providers.wmo_swic?.status === "CONNECTED"
                ? `${providers.wmo_swic.total_alerts_fetched.toLocaleString()} active warnings`
                : "Unavailable"}
            </p>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              providers.wmo_swic?.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
        </div>

        {/* GDACS */}
        <div className="p-3 bg-slate-850/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              GDACS (UN OCHA / EC)
            </span>
            <p className="text-xs font-bold text-white">
              {providers.gdacs?.status === "CONNECTED"
                ? `${providers.gdacs.total_alerts_fetched.toLocaleString()} active disasters`
                : "Unavailable"}
            </p>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              providers.gdacs?.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
        </div>

        {/* Alert-Hub.org */}
        <div className="p-3 bg-slate-850/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Alert-Hub.org Stream
            </span>
            <p className="text-xs font-bold text-white">
              {providers.alert_hub?.status === "CONNECTED"
                ? `${providers.alert_hub.total_alerts_fetched.toLocaleString()} CAP feeds`
                : "Unavailable"}
            </p>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              providers.alert_hub?.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
        </div>
      </div>

      {/* Categorical Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("official")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "official"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Official CAP Severe Warnings ({officialWarnings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("gdacs")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "gdacs"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Multi-Hazard Disasters — GDACS ({disasterAlerts.length})</span>
        </button>
      </div>

      {/* Tab 1: Official CAP Severe Warnings */}
      {activeTab === "official" && (
        <div className="space-y-3">
          {officialWarnings.length > 0 ? (
            officialWarnings.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-slate-850/60 border border-slate-750 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${getSeverityBadgeClass(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {alert.source_provider}
                    </span>
                    {alert.country_code && (
                      <span className="text-[11px] font-mono font-bold text-blue-300">
                        [{alert.country_code}]
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {alert.effective_time ? `Issued: ${alert.effective_time}` : ""}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mt-2 leading-snug">{alert.headline}</h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">{alert.description}</p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500">Issuer:</span>
                    <span className="text-slate-300">{alert.issuer}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-semibold text-slate-500">Area:</span>
                    <span className="text-slate-300">{alert.affected_area}</span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {onSelectAlert && (
                      <button
                        onClick={() => onSelectAlert(alert)}
                        className="text-blue-400 hover:text-blue-300 font-semibold text-xs"
                      >
                        Inspect Details
                      </button>
                    )}
                    <a
                      href={alert.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 font-medium"
                    >
                      <span>Official CAP</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <Info className="w-6 h-6 text-blue-400 mx-auto" />
              <p className="text-sm font-semibold text-white">
                No active official CAP weather warnings match current filter criteria.
              </p>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                {isFiltered
                  ? `There are currently no active WMO SWIC bulletins reported specifically for country ${selectedCountry || "selected region"}.`
                  : "No official CAP warnings available."}
              </p>
              {isFiltered && (
                <button
                  onClick={onToggleFilter}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/30 transition-colors"
                >
                  <span>View All Global Alerts ({providers.wmo_swic?.total_alerts_fetched || 0} active)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: GDACS Multi-Hazard Disaster Alerts */}
      {activeTab === "gdacs" && (
        <div className="space-y-3">
          {disasterAlerts.length > 0 ? (
            disasterAlerts.map((disaster) => (
              <div
                key={disaster.id}
                className="p-4 rounded-xl bg-slate-850/60 border border-slate-750 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getDisasterIcon(disaster.event)}
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${getSeverityBadgeClass(disaster.severity)}`}>
                      {disaster.severity}
                    </span>
                    <span className="text-xs font-bold text-white">{disaster.event}</span>
                    {disaster.country_code && (
                      <span className="text-[11px] font-mono text-slate-400">
                        ({disaster.country_code})
                      </span>
                    )}
                  </div>

                  {disaster.distance_km !== undefined && disaster.distance_km !== null && (
                    <div className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      ~{Math.round(disaster.distance_km).toLocaleString()} km from selected coordinate
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white mt-2 leading-snug">{disaster.headline}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{disaster.description}</p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500">Location:</span>
                    <span className="text-slate-300">{disaster.affected_area}</span>
                    {disaster.latitude && disaster.longitude && (
                      <span className="font-mono text-slate-500">
                        [{disaster.latitude.toFixed(2)}°, {disaster.longitude.toFixed(2)}°]
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {onSelectAlert && (
                      <button
                        onClick={() => onSelectAlert(disaster)}
                        className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
                      >
                        Inspect Details
                      </button>
                    )}
                    <a
                      href={disaster.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 font-medium"
                    >
                      <span>GDACS Report</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <Info className="w-6 h-6 text-amber-400 mx-auto" />
              <p className="text-sm font-semibold text-white">
                No active GDACS multi-hazard disaster events in this spatial radius.
              </p>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                No major tropical cyclones, widespread floods, or earthquakes detected within search boundaries.
              </p>
              {isFiltered && (
                <button
                  onClick={onToggleFilter}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition-colors"
                >
                  <span>View All Global Disasters ({providers.gdacs?.total_alerts_fetched || 0} active)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transparent Coverage Limitation Notice */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">Data Integrity Notice on Emergency Bulletins:</strong> SkyGuard operates under strict zero-fabrication rules. An empty alert list for any location does <strong>NOT</strong> mean &quot;All Clear&quot; or &quot;No Danger&quot;. Not all domestic agencies publish active CAP feeds to international aggregators. For emergency directives in your territory, always verify official civil defense and national meteorological channels.
        </div>
      </div>
    </div>
  );
};
