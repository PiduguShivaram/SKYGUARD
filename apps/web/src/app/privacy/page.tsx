"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { Shield, ArrowLeft, AlertCircle, FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0C0F14] text-text-primary font-sans selection:bg-brand-fill selection:text-white">
      <Header upstreamStatus="CONNECTED" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-brand-text hover:text-white transition-colors px-3 py-2 rounded-sg bg-surface-panel border border-border-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Local Weather</span>
          </Link>
          <span className="text-xs font-mono text-text-muted">Document Version: 2026.1 (Draft)</span>
        </div>

        {/* Header Title */}
        <div className="space-y-3 pb-6 border-b border-border-subtle">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sg bg-surface-panel border border-border-subtle text-xs font-mono text-brand-text">
            <Shield className="w-3.5 h-3.5" />
            <span>Data Transparency &amp; Privacy Statement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
            This document outlines the exact technical data flows, local storage items, and third-party interactions implemented in SkyGuard. Sections requiring business or legal validation are flagged with [OWNER TO CONFIRM].
          </p>
        </div>

        {/* Section 1: Entity & Architecture */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>1. Organization &amp; Operational Overview</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            SkyGuard provides real-time public weather intelligence, agro-meteorological monitoring, and official emergency disaster bulletin aggregation. The platform is architected around principles of zero synthetic data, minimal data retention, and privacy preservation.
          </p>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm legal entity name, country/jurisdiction of registration, primary operational address, and designated privacy contact email (e.g. privacy@skyguard.org).
            </p>
          </div>
        </section>

        {/* Section 2: Geolocation Processing */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>2. Geolocation Data Handling</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            SkyGuard handles geographical data strictly through user-initiated actions:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              <strong className="text-text-primary">On-Demand Device GPS:</strong> When you click &quot;Use my location&quot;, coordinates (latitude and longitude) are accessed via the browser HTML5 Geolocation API. These coordinates are held in memory to request weather forecasts and nearby disaster bulletins. They are never recorded in a continuous movement profile or tracking database.
            </li>
            <li>
              <strong className="text-text-primary">Manual Location Queries:</strong> When searching for a city, district, or town, search strings are transmitted to the Open-Meteo Geocoding API.
            </li>
            <li>
              <strong className="text-text-primary">Local Storage Cache:</strong> Up to five recently selected locations are saved exclusively in your browser local storage (<code className="text-brand-text">skyguard_recent_locations</code>) for quick access. This data remains on your device.
            </li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm whether web server or reverse proxy access logs (e.g., Nginx, Vercel, Cloudflare) retain request IP addresses, and confirm the log rotation / retention schedule (e.g., 14 days).
            </p>
          </div>
        </section>

        {/* Section 3: Web Push Notifications */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>3. Web Push Notification Subscriptions</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            When you opt in to receive emergency alerts via browser Web Push:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              Your browser generates a standards-compliant W3C Push Subscription containing a public endpoint and encryption keys (P256DH and auth secret).
            </li>
            <li>
              These keys are stored in the server database (<code className="text-brand-text">push_subscriptions</code>) alongside your selected alert preferences (country code, proximity radius, minimum severity, and alert categories).
            </li>
            <li>
              A private possession token is issued to your browser and stored in <code className="text-brand-text">skyguard_push_token</code>. This token is required for all subsequent preference updates or unsubscriptions.
            </li>
            <li>
              No name, email address, or phone number is linked to Web Push subscriptions.
            </li>
            <li>
              Disabling notifications deletes the subscription record from the database.
            </li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm database retention policy for expired or unreachable Web Push endpoints (e.g., automated pruning after receiving HTTP 410 Gone from push services).
            </p>
          </div>
        </section>

        {/* Section 4: Telegram Mobile Alerts */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>4. Telegram Mobile Alert Subscriptions</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            If you choose to receive alerts via the SkyGuard Telegram Bot:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              You provide your Telegram Chat ID, obtained by opening the official bot.
            </li>
            <li>
              A 6-digit challenge code is sent to your Telegram chat to verify ownership.
            </li>
            <li>
              Upon successful verification, the Chat ID and an authorization token are stored in the database (<code className="text-brand-text">telegram_subscriptions</code>) and locally in <code className="text-brand-text">skyguard_telegram_chat_id</code> and <code className="text-brand-text">skyguard_telegram_token</code>.
            </li>
            <li>
              Chat IDs are used strictly for emergency dispatch and are unlinked upon user request.
            </li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm Telegram Bot API server jurisdiction and confirm that bot message logs are not permanently retained on external infrastructure.
            </p>
          </div>
        </section>

        {/* Section 5: Cookies, Storage & Analytics */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>5. Storage, Cookies &amp; Tracking Telemetry</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            An audit of the SkyGuard codebase confirms:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              <strong className="text-text-primary">Cookies:</strong> Zero HTTP cookies are set or consumed by SkyGuard application code.
            </li>
            <li>
              <strong className="text-text-primary">Third-Party Analytics:</strong> No tracking pixels, Google Analytics, advertising SDKs, or session replay tools are installed or loaded.
            </li>
            <li>
              <strong className="text-text-primary">Browser Local Storage:</strong> Used exclusively for operational preferences (<code className="text-brand-text">skyguard_push_sub_id</code>, <code className="text-brand-text">skyguard_push_token</code>, <code className="text-brand-text">skyguard_telegram_chat_id</code>, <code className="text-brand-text">skyguard_telegram_token</code>, <code className="text-brand-text">skyguard_recent_locations</code>, <code className="text-brand-text">skyguard_device_user_id</code>).
            </li>
            <li>
              <strong className="text-text-primary">Supabase Storage:</strong> Optional authenticated features store saved sector coordinates in <code className="text-brand-text">saved_locations</code> and alert preferences in <code className="text-brand-text">user_alert_preferences</code> protected by Row-Level Security. Anonymous authentication (<code className="text-brand-text">signInAnonymously</code>) is not utilized.
            </li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm cloud hosting region for Supabase PostgreSQL (e.g. AWS eu-central-1 or ap-south-1) and compliance with relevant data residency requirements.
            </p>
          </div>
        </section>

        {/* Section 6: Third-Party Data Providers */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>6. Third-Party Upstream Integrations</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            SkyGuard retrieves environmental observations and warning bulletins from authoritative open providers:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              <strong className="text-text-primary">Open-Meteo:</strong> Weather forecasts, numerical model runs, and geocoding. Only latitude and longitude coordinates are sent.
            </li>
            <li>
              <strong className="text-text-primary">World Meteorological Organization (WMO SWIC):</strong> Official Common Alerting Protocol (CAP) warning bulletins.
            </li>
            <li>
              <strong className="text-text-primary">GDACS (UN OCHA / EC):</strong> Global Disaster Alert and Coordination System disaster feeds.
            </li>
            <li>
              <strong className="text-text-primary">Aviation Weather Center (NOAA / NWS):</strong> METAR surface observations for regional airport weather stations.
            </li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Verify that upstream API keys or service agreements comply with open public data licensing guidelines.
            </p>
          </div>
        </section>

        {/* Section 7: User Rights */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>7. Data Rights &amp; Deletion</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            You maintain full control over any data associated with your device or subscription:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>You can clear all stored locations and tokens at any time by clearing your browser local storage.</li>
            <li>You can disable Web Push directly from the Notification Settings dialog, which removes the database record.</li>
            <li>You can unlink your Telegram Chat ID at any time from the Notification Settings dialog.</li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Designate formal process and timeline (e.g. 30 days) for addressing manual GDPR / CCPA deletion requests sent to the privacy contact email.
            </p>
          </div>
        </section>
      </main>

      <ProvenanceFooter weather={null} />
    </div>
  );
}
