"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { Layers, Crosshair, ZoomIn, ZoomOut, Radio, Maximize2, Minimize2 } from "lucide-react";

interface WeatherRadarMapProps {
  lat: number;
  lon: number;
  cityName: string;
  temperature?: number | string | null;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  theme?: "light" | "dark";
}

export function WeatherRadarMap({
  lat,
  lon,
  cityName,
  temperature,
  className = "",
  isExpanded = false,
  onToggleExpand,
  theme = "light",
}: WeatherRadarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [radarVisible, setRadarVisible] = useState<boolean>(true);
  const [radarTimestamp, setRadarTimestamp] = useState<string>("Loading...");
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    const isLight = theme === "light";
    const baseTileUrl = isLight
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
    const labelTileUrl = isLight
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
      : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

    const baseLayer = L.tileLayer(baseTileUrl, {
      maxZoom: 16,
      attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
    });
    baseLayer.addTo(map);
    baseLayerRef.current = baseLayer;

    const labelsLayer = L.tileLayer(labelTileUrl, {
      maxZoom: 16,
      zIndex: 5,
      opacity: 0.85,
    });
    labelsLayer.addTo(map);
    labelsLayerRef.current = labelsLayer;

    // Initial Location Marker with decorated pulsating beacon
    const customIcon = L.divIcon({
      className: "custom-weather-pin",
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(37, 99, 235, 0.45); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -7px; left: -7px;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);"></div>
          <div style="margin-top: 6px; padding: 3px 10px; border-radius: 4px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(8px); border: 1px solid rgba(37, 99, 235, 0.3); color: #1E3A8A; font-family: monospace; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
            ${cityName}${temperature ? ` · ${temperature}°` : ""}
          </div>
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Fetch RainViewer real-time radar mosaic
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((res) => res.json())
      .then((data) => {
        const pastFrames = data?.radar?.past;
        if (pastFrames && pastFrames.length > 0) {
          const latest = pastFrames[pastFrames.length - 1];
          const host = data.host || "https://tilecache.rainviewer.com";
          const radarTileUrl = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

          const radarLayer = L.tileLayer(radarTileUrl, {
            opacity: 0.75,
            zIndex: 10,
          });

          radarLayer.addTo(map);
          radarLayerRef.current = radarLayer;

          const date = new Date(latest.time * 1000);
          setRadarTimestamp(date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        } else {
          setRadarTimestamp("Live Coverage");
        }
      })
      .catch(() => {
        setRadarTimestamp("Live Coverage");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Smooth flyTo and update marker when lat/lon or city changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([lat, lon], 7, { duration: 1.2 });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      const customIcon = L.divIcon({
        className: "custom-weather-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(56, 189, 248, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -7px; left: -7px;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #38BDF8; border: 2px solid #FFFFFF; box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);"></div>
            <div style="margin-top: 6px; padding: 2px 8px; border-radius: 4px; background: rgba(10, 19, 36, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.25); color: #FFFFFF; font-family: monospace; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              ${cityName}${temperature ? ` · ${temperature}°` : ""}
            </div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markerRef.current.setIcon(customIcon);
    }
  }, [lat, lon, cityName, temperature]);

  // Invalidate map size when expanded
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
    }
  }, [isExpanded]);

  // Toggle radar layer
  const toggleRadar = useCallback(() => {
    const map = mapInstanceRef.current;
    const radar = radarLayerRef.current;
    if (!map || !radar) return;

    if (radarVisible) {
      map.removeLayer(radar);
      setRadarVisible(false);
    } else {
      map.addLayer(radar);
      setRadarVisible(true);
    }
  }, [radarVisible]);

  // Re-center on city
  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 7, { duration: 0.8 });
    }
  }, [lat, lon]);

  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  return (
    <div
      className={`relative w-full rounded-sg overflow-hidden border transition-all duration-300 shadow-card ${
        theme === "light"
          ? "border-white/40 bg-white/40 backdrop-blur-md"
          : "border-white/15 bg-[#0A1324]/90 backdrop-blur-md"
      } ${isExpanded ? "h-[450px]" : "h-[260px] sm:h-[280px]"} ${className}`}
    >
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Top Floating Badge: Radar Status */}
      <div className="absolute top-2.5 left-2.5 z-[400] flex items-center gap-2 pointer-events-auto">
        <div
          className={`px-3 py-1 rounded-sg backdrop-blur-md border flex items-center gap-2 text-xs font-mono shadow-md ${
            theme === "light"
              ? "bg-white/90 text-slate-900 border-white/70"
              : "bg-black/70 text-white border-white/20"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
          <span className="font-bold tracking-tight">Doppler Radar</span>
          <span className="opacity-40">•</span>
          <span className={theme === "light" ? "text-blue-600 font-semibold text-[11px]" : "text-sky-300 text-[11px]"}>
            {radarTimestamp}
          </span>
        </div>
      </div>

      {/* Top Right Controls: Decorated Toggle Radar & Expand Buttons */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={toggleRadar}
          title={radarVisible ? "Hide Radar Layer" : "Show Radar Layer"}
          className={`p-2 rounded-sg text-xs font-mono transition-all duration-200 border shadow-md hover:scale-105 active:scale-95 ${
            radarVisible
              ? "bg-[#2563EB] text-white border-blue-400/80 shadow-[0_2px_10px_rgba(37,99,235,0.4)]"
              : theme === "light"
              ? "bg-white/80 hover:bg-white text-slate-700 border-white/60"
              : "bg-black/60 hover:bg-black/80 text-white/70 border-white/20"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            title={isExpanded ? "Collapse Map" : "Expand Map"}
            className={`p-2 rounded-sg transition-all duration-200 border shadow-md hover:scale-105 active:scale-95 ${
              theme === "light"
                ? "bg-white/80 hover:bg-white text-slate-700 border-white/60"
                : "bg-black/60 hover:bg-black/80 text-white/80 border-white/20"
            }`}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Bottom Right Zoom & Center Controls: Decorated Buttons */}
      <div className="absolute bottom-2.5 right-2.5 z-[400] flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecenter}
          title="Center on Location"
          className={`p-2 rounded-sg transition-all duration-200 border shadow-md hover:scale-105 active:scale-95 ${
            theme === "light"
              ? "bg-white/85 hover:bg-white text-slate-800 border-white/70"
              : "bg-black/60 hover:bg-black/80 text-white/80 border-white/20"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className={`p-2 rounded-sg transition-all duration-200 border shadow-md hover:scale-105 active:scale-95 ${
            theme === "light"
              ? "bg-white/85 hover:bg-white text-slate-800 border-white/70"
              : "bg-black/60 hover:bg-black/80 text-white/80 border-white/20"
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className={`p-2 rounded-sg transition-all duration-200 border shadow-md hover:scale-105 active:scale-95 ${
            theme === "light"
              ? "bg-white/85 hover:bg-white text-slate-800 border-white/70"
              : "bg-black/60 hover:bg-black/80 text-white/80 border-white/20"
          }`}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Left Legend: Intensity scale */}
      {radarVisible && (
        <div className="absolute bottom-2.5 left-2.5 z-[400] pointer-events-none">
          <div
            className={`px-2.5 py-1 rounded-sg backdrop-blur-md border text-[10px] font-mono flex items-center gap-2 shadow-md ${
              theme === "light"
                ? "bg-white/85 text-slate-800 border-white/60"
                : "bg-black/60 text-white/90 border-white/20"
            }`}
          >
            <span className="font-medium">Precipitation:</span>
            <div className="flex items-center gap-0.5">
              <span className="w-2.5 h-1.5 rounded-sm bg-[#00ffff]" title="Light" />
              <span className="w-2.5 h-1.5 rounded-sm bg-[#00aaff]" />
              <span className="w-2.5 h-1.5 rounded-sm bg-[#00ff00]" />
              <span className="w-2.5 h-1.5 rounded-sm bg-[#ffff00]" />
              <span className="w-2.5 h-1.5 rounded-sm bg-[#ff8800]" />
              <span className="w-2.5 h-1.5 rounded-sm bg-[#ff0000]" title="Heavy" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}