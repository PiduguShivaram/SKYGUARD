"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { ErrorState } from "@/components/ErrorState";
import { AlertDetailModal } from "@/components/AlertDetailModal";
import { NotificationSettingsModal } from "@/components/NotificationSettingsModal";
import { PlanetaryDisasterGlobe } from "@/components/living/PlanetaryDisasterGlobe";
import { checkBackendHealth, getGlobalAlerts } from "@/lib/api";
import { subscribeToRealtimeAlerts, RealtimeConnectionStatus } from "@/lib/supabase";
import { GlobalAlertItem, GlobalAlertsResponse } from "@/types";
import {
  ShieldAlert,
  Globe,
  Radio,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  ArrowLeft,
  Flame,
  Waves,
  Wind,
  Activity,
} from "lucide-react";

type DisasterCategoryFilter = "all" | "extreme" | "severe" | "flood" | "storm" | "quake_fire";

export default function DisastersPage() {
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [alertsData, setAlertsData] = useState<GlobalAlertsResponse | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<DisasterCategoryFilter>("all");
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<GlobalAlertItem | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>("CONNECTING");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const subId = localStorage.getItem("skyguard_push_sub_id");
      setNotificationsActive(!!subId);
    }
  }, [isNotificationModalOpen]);

  const loadAlerts = async () => {
    setLoadingAlerts(true);
    setError(null);
    try {
      const [health, alerts] = await Promise.all([
        checkBackendHealth().catch(() => ({ status: "degraded", service: "skyguard-api", version: "1.0.0" })),
        getGlobalAlerts(),
      ]);
      setUpstreamStatus(health.status === "healthy" ? "CONNECTED" : "DEGRADED");
      setAlertsData(alerts);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load global disaster telemetry.");
      setUpstreamStatus("UNAVAILABLE");
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // 1. Real-time auto-refresh interval (every 60s)
    const interval = setInterval(() => {
      loadAlerts();
    }, 60000);

    // 2. Real-time Supabase WebSocket push listener with connection tracking
    const unsubscribe = subscribeToRealtimeAlerts(
      () => {
        loadAlerts();
      },
      (status) => {
        setRealtimeStatus(status);
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const allAlerts: GlobalAlertItem[] = useMemo(() => {
    if (!alertsData) return [];
    return [
      ...(alertsData.official_cap_warnings || []),
      ...(alertsData.gdacs_disaster_alerts || []),
    ];
  }, [alertsData]);

  const filteredAlerts = useMemo(() => {
    if (!allAlerts.length) return [];
    return allAlerts.filter((item: GlobalAlertItem) => {
      const text = `${item.event || ""} ${item.headline || ""} ${item.description || ""}`.toLowerCase();
      if (categoryFilter === "extreme") {
        return item.severity === "Extreme";
      }
      if (categoryFilter === "severe") {
        return item.severity === "Severe";
      }
      if (categoryFilter === "flood") {
        return text.includes("flood") || text.includes("rain") || text.includes("inundation");
      }
      if (categoryFilter === "storm") {
        return text.includes("cyclone") || text.includes("typhoon") || text.includes("hurricane") || text.includes("wind") || text.includes("storm") || text.includes("gale");
      }
      if (categoryFilter === "quake_fire") {
        return text.includes("fire") || text.includes("earthquake") || text.includes("tremor") || text.includes("volcano");
      }
      return true;
    });
  }, [allAlerts, categoryFilter]);

  const stats = useMemo(() => {
    const totalWmo = alertsData?.total_worldwide_official_warnings || alertsData?.official_cap_warnings?.length || 0;
    const totalGdacs = alertsData?.total_worldwide_disasters || alertsData?.gdacs_disaster_alerts?.length || 0;
    const extremeCount = allAlerts.filter((a) => a.severity === "Extreme").length;
    return {
      totalWmo,
      totalGdacs,
      extremeCount,
      totalEvents: allAlerts.length,
    };
  }, [alertsData, allAlerts]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0C0F14] text-text-primary font-sans selection:bg-brand-fill selection:text-white overflow-x-hidden">
      {/* Flat canvas substrate (Decision D1=C) */}
      <div className="fixed inset-0 z-0 bg-[#0C0F14] pointer-events-none" />

      {/* Top Header */}
      <Header
        upstreamStatus={upstreamStatus}
        activeNav="disasters"
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notificationsActive={notificationsActive}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Breadcrumb & Navigation Back to Local Weather */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-brand-text hover:text-white transition-colors px-3 py-2 rounded-sg bg-surface-panel border border-border-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Local Weather</span>
          </Link>

          <button
            type="button"
            onClick={loadAlerts}
            disabled={loadingAlerts}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-white px-3 py-2 rounded-sg bg-surface-panel border border-border-subtle transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? "animate-spin text-brand-text" : ""}`} />
            <span>Refresh Feeds</span>
          </button>
        </div>

        {/* Real-time Telemetry Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-sg surface-panel text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                realtimeStatus === "SUBSCRIBED"
                  ? "bg-emerald-400 opacity-75"
                  : realtimeStatus === "CONNECTING"
                  ? "bg-amber-400 opacity-75"
                  : "bg-slate-500 opacity-50"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                realtimeStatus === "SUBSCRIBED"
                  ? "bg-emerald-500"
                  : realtimeStatus === "CONNECTING"
                  ? "bg-amber-500"
                  : "bg-slate-400"
              }`}></span>
            </span>
            <span className={`font-semibold tracking-wide ${
              realtimeStatus === "SUBSCRIBED"
                ? "text-emerald-400"
                : realtimeStatus === "CONNECTING"
                ? "text-amber-300"
                : "text-text-muted"
            }`}>
              {realtimeStatus === "SUBSCRIBED"
                ? "REAL-TIME WEBSOCKET: CONNECTED"
                : realtimeStatus === "CONNECTING"
                ? "CONNECTING TO WEBSOCKET STREAM..."
                : "FALLBACK: 60s POLL CADENCE"}
            </span>
            <span className="text-text-muted hidden sm:inline">: Supabase Realtime + Upstream Feeds</span>
          </div>
          <div className="text-text-muted text-[11px]">
            Last Synchronized: <span className="text-text-primary font-mono">{lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Hero Title & Telemetry Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sg bg-surface-panel border border-border-subtle text-xs font-mono text-brand-text">
            <Globe className="w-3.5 h-3.5" />
            <span>Planetary Disaster Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Global Disaster Radar
          </h1>
          <p className="text-sm text-text-muted leading-relaxed font-normal">
            Direct authoritative feeds from the World Meteorological Organization (WMO Severe Weather Information Centre) and the United Nations / European Commission Global Disaster Alert and Coordination System (GDACS).
          </p>
        </div>

        {/* Live Telemetry KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-sg surface-panel">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              Active Bulletins
            </span>
            <span className="text-2xl font-semibold tabular-nums text-white">
              {stats.totalEvents.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-brand-text block mt-1">
              WMO + GDACS
            </span>
          </div>

          <div className="p-4 rounded-sg surface-panel">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              Extreme Hazards
            </span>
            <span className="text-2xl font-semibold tabular-nums text-red-400">
              {stats.extremeCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-red-400 block mt-1">
              Immediate Life Safety
            </span>
          </div>

          <div className="p-4 rounded-sg surface-panel">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              WMO Official CAP
            </span>
            <span className="text-2xl font-semibold tabular-nums text-brand-text">
              {stats.totalWmo.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-text-muted block mt-1">
              Meteorological Warnings
            </span>
          </div>

          <div className="p-4 rounded-sg surface-panel">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              UN / EC GDACS
            </span>
            <span className="text-2xl font-semibold tabular-nums text-amber-300">
              {stats.totalGdacs.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-text-muted block mt-1">
              Multi-Hazard Events
            </span>
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <ErrorState
            title="Telemetry Feed Notice"
            message={error}
            onRetry={loadAlerts}
          />
        )}

        {/* 3D Planetary Disaster Globe Centerpiece */}
        <section className="surface-panel rounded-sg p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col items-center">
            <PlanetaryDisasterGlobe
              alerts={allAlerts}
              onSelectAlert={(a) => setSelectedAlertForDetail(a)}
              selectedAlertId={selectedAlertForDetail?.id}
            />
          </div>
        </section>

        {/* Filter Controls */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-text" />
              <h2 className="text-sm font-mono uppercase tracking-widest text-text-primary">
                Active Bulletins ({filteredAlerts.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-sg transition-colors ${
                  categoryFilter === "all"
                    ? "bg-brand-fill text-white font-semibold"
                    : "bg-surface-panel text-text-muted hover:text-white border border-border-subtle"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("extreme")}
                className={`px-3 py-1.5 rounded-sg transition-colors ${
                  categoryFilter === "extreme"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 font-semibold"
                    : "bg-surface-panel text-text-muted hover:text-white border border-border-subtle"
                }`}
              >
                Extreme
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("severe")}
                className={`px-3 py-1.5 rounded-sg transition-colors ${
                  categoryFilter === "severe"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold"
                    : "bg-surface-panel text-text-muted hover:text-white border border-border-subtle"
                }`}
              >
                Severe
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("flood")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-sg transition-colors ${
                  categoryFilter === "flood"
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold"
                    : "bg-surface-panel text-text-muted hover:text-white border border-border-subtle"
                }`}
              >
                <Waves className="w-3 h-3" />
                <span>Floods</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("storm")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-sg transition-colors ${
                  categoryFilter === "storm"
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/40 font-semibold"
                    : "bg-surface-panel text-text-muted hover:text-white border border-border-subtle"
                }`}
              >
                <Wind className="w-3 h-3" />
                <span>Storms</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("quake_fire")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-sg transition-colors ${
                  categoryFilter === "quake_fire"
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 font-semibold"
                    : "bg-surface-panel text-text-muted hover:text-white border border-border-subtle"
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Quakes &amp; Fires</span>
              </button>
            </div>
          </div>

          {/* Alert Cards Grid */}
          {loadingAlerts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-5 rounded-sg surface-panel animate-pulse space-y-3">
                  <div className="h-4 bg-surface-base rounded-sg w-1/3" />
                  <div className="h-5 bg-surface-base rounded-sg w-4/5" />
                  <div className="h-3 bg-surface-base rounded-sg w-full" />
                </div>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center rounded-sg surface-panel">
              <p className="text-xs font-mono text-text-muted uppercase tracking-widest">
                No active disaster events matching current filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAlerts.slice(0, 30).map((alert: GlobalAlertItem) => {
                const isExtreme = alert.severity === "Extreme";
                const isSevere = alert.severity === "Severe";
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertForDetail(alert)}
                    className="p-4 rounded-sg surface-panel hover:border-border-strong transition-colors cursor-pointer flex flex-col justify-between group shadow-sm border-l-4"
                    style={{
                      borderLeftColor: isExtreme ? "#DC2626" : isSevere ? "#D97706" : "#2563EB",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-sg font-semibold uppercase tracking-wider ${
                            isExtreme
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : isSevere
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-blue-600/20 text-blue-300 border border-blue-500/40"
                          }`}
                        >
                          {alert.severity || "Advisory"}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted truncate">
                          {alert.source_provider || "WMO CAP"}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-text-primary group-hover:text-brand-text transition-colors line-clamp-1">
                        {alert.headline || alert.event || "Meteorological Hazard"}
                      </h3>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">
                        {alert.affected_area || alert.issuer || "Official WMO Common Alerting Protocol event."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle text-[11px] font-mono text-text-muted">
                      <span>
                        {alert.latitude && alert.longitude
                          ? `${alert.latitude.toFixed(1)}°, ${alert.longitude.toFixed(1)}°`
                          : alert.country_code || "Global Sector"}
                      </span>
                      <span className="text-brand-text transition-colors flex items-center gap-0.5">
                        <span>Inspect Bulletin</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Provenance Footer */}
      <footer className="relative z-20 mt-16 border-t border-border-subtle">
        <ProvenanceFooter weather={null} />
      </footer>

      {/* Modals */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      <AlertDetailModal
        alertId={selectedAlertForDetail?.id || null}
        onClose={() => setSelectedAlertForDetail(null)}
        preloadedAlert={selectedAlertForDetail}
      />
    </div>
  );
}
