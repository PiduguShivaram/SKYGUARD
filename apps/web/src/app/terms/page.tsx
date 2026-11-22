"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { Scale, ArrowLeft, AlertCircle, FileText } from "lucide-react";

export default function TermsAndConditionsPage() {
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
            <Scale className="w-3.5 h-3.5" />
            <span>Operational Agreement &amp; Disclaimer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Terms and Conditions
          </h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-2xl">
            These terms define the conditions of access and usage for the SkyGuard platform. Areas requiring legal verification by the product owner or legal counsel are flagged with [OWNER TO CONFIRM].
          </p>
        </div>

        {/* Section 1: Agreement to Terms */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>1. Agreement &amp; Acceptance</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            By accessing or using SkyGuard, you agree to be bound by these terms. If you do not agree with any part of these terms, you should discontinue using the platform.
          </p>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm governing law, legal entity, and jurisdiction (e.g. State of Karnataka, India / England &amp; Wales / State of Delaware, USA).
            </p>
          </div>
        </section>

        {/* Section 2: Critical Emergency Disclaimer */}
        <section className="space-y-3 surface-panel p-6 rounded-sg border-l-4 border-l-[#DC2626]">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-400" />
            <span>2. Safety-Critical Advisory &amp; Emergency Disclaimer</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            <strong className="text-white">NOT AN OFFICIAL EMERGENCY MANAGEMENT DIRECTIVE:</strong> SkyGuard is an independent informational platform that aggregates public meteorological model runs (Open-Meteo) and international disaster bulletins (WMO, GDACS). SkyGuard is not an official government civil defense agency, national weather service, or emergency dispatch authority.
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              In any imminent life-safety event, flood, cyclone, wildfire, or disaster, users must follow instructions, evacuation orders, and warnings directly issued by local civil protection agencies and national authorities (e.g., IMD, NDMA, NOAA, ECMWF, national disaster management organizations).
            </li>
            <li>
              Automated notifications and experimental risk evaluations must never be used as the sole basis for life-safety, marine navigation, aviation, or hazardous operational decisions.
            </li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Ensure exact statutory wording meets emergency service disclaimer standards in your target operating countries.
            </p>
          </div>
        </section>

        {/* Section 3: Data Integrity & Experimental Gating */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>3. Data Accuracy, Gating &amp; Invariants</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            SkyGuard enforces strict operational data invariants:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>
              <strong className="text-text-primary">Zero Synthetic Data:</strong> Real-time numerical weather data, forecasts, and disaster alerts are never fabricated or simulated in production mode.
            </li>
            <li>
              <strong className="text-text-primary">Source Attribution:</strong> Every observation and bulletin explicitly displays its upstream provider and retrieval timestamp.
            </li>
            <li>
              <strong className="text-text-primary">Hardware Gating:</strong> In Farmer Mode, uncalibrated IoT soil moisture sensors or simulated vegetative indices are strictly gated and marked as unavailable rather than displaying synthetic metrics.
            </li>
          </ul>
          <p className="text-xs text-text-muted leading-relaxed">
            Meteorological models are inherently probabilistic and subject to forecast uncertainty. SkyGuard makes no guarantee that forecasts will be error-free or that upstream services will operate without interruption.
          </p>
        </section>

        {/* Section 4: Limitation of Liability */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>4. Limitation of Liability</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            To the maximum extent permitted by applicable law, the operators and contributors of SkyGuard shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including without limitation:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>Loss of crops, livestock, agricultural yield, or business revenue resulting from weather events or advisory reliance.</li>
            <li>Property damage or personal injury resulting from severe weather or disaster events.</li>
            <li>Failure, delay, or network disruption in the delivery of push notifications or Telegram messages.</li>
          </ul>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm legal liability cap language (e.g., total liability limited to amounts paid to the platform or a nominal amount) with legal counsel.
            </p>
          </div>
        </section>

        {/* Section 5: Acceptable Use */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>5. Acceptable Use Policy</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            SkyGuard is provided for personal awareness, scientific research, community safety, and agricultural management. You agree not to:
          </p>
          <ul className="list-disc list-inside text-xs text-text-muted space-y-1.5 pl-1">
            <li>Abuse, flood, or execute denial-of-service requests against the backend API or upstream public meteorological feeds.</li>
            <li>Attempt to forge, alter, or impersonate official CAP emergency warning payloads.</li>
            <li>Exploit notification endpoints for unauthorized messaging or spam.</li>
          </ul>
        </section>

        {/* Section 6: Intellectual Property & Attribution */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>6. Intellectual Property &amp; Open Data Licensure</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            The SkyGuard user interface, branding, and proprietary aggregation algorithms are the property of their respective creators. Meteorological data and emergency bulletins remain the intellectual property and copyright of their respective issuing bodies (Open-Meteo, WMO Member States, UN OCHA GDACS, ICAR).
          </p>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm code repository license (e.g. MIT, Apache 2.0, or proprietary commercial) and attribution requirements for embedded third-party libraries.
            </p>
          </div>
        </section>

        {/* Section 7: Amendments & Inquiries */}
        <section className="space-y-3 surface-panel p-6 rounded-sg">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-text" />
            <span>7. Contact &amp; Modifications</span>
          </h2>
          <p className="text-xs text-text-primary leading-relaxed">
            These terms may be updated from time to time to reflect evolving regulatory frameworks or service features. Continued use of the platform constitutes acceptance of revised terms.
          </p>
          <div className="p-3 bg-surface-base border border-amber-500/30 rounded-sg text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>[OWNER TO CONFIRM]</span>
            </div>
            <p>
              Confirm designated contact email for legal notices and terms inquiries (e.g. legal@skyguard.org).
            </p>
          </div>
        </section>
      </main>

      <ProvenanceFooter weather={null} />
    </div>
  );
}
