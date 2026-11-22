"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Wind, Droplets, Compass, ShieldAlert, Sparkles } from "lucide-react";
import { LocationSearchResult, WeatherForecastResponse, CurrentWeather } from "@/types";
import { getForecast } from "@/lib/api";
import { useAtmosphereState } from "@/hooks/useAtmosphereState";
import { AtmosphericSkyScene } from "@/components/living/AtmosphericSkyScene";
import { LivingWeatherIcon } from "@/components/living/LivingWeatherIcons";
import { LivingLocationSearch } from "@/components/living/LivingLocationSearch";
import { InteractiveTimelineScrubber } from "@/components/living/InteractiveTimelineScrubber";

const DEFAULT_LOCATION: LocationSearchResult = {
  id: 1850147,
  name: "Tokyo",
  latitude: 35.6895,
  longitude: 139.6917,
  country: "Japan",
  admin1: "Tokyo",
  formatted_label: "Tokyo, Japan",
};

export default function LivingSkyPage() {
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult>(DEFAULT_LOCATION);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);

  // Fetch authentic weather data on location change
  useEffect(() => {
    let isCancelled = false;
    async function loadWeather() {
      setLoading(true);
      setError(null);
      try {
        const data = await getForecast(selectedLocation.latitude, selectedLocation.longitude);
        if (!isCancelled) {
          setWeatherData(data);
          setSelectedHourIndex(0);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load genuine meteorological data.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadWeather();
    return () => {
      isCancelled = true;
    };
  }, [selectedLocation]);

  const currentWeather: CurrentWeather | null = weatherData?.current ?? null;
  const palette = useAtmosphereState(currentWeather);

  // If user is scrubbing, preview that specific hour's temperature
  const activeHourPoint = weatherData?.hourly?.[selectedHourIndex] ?? null;
  const displayTemperature = activeHourPoint
    ? Math.round(activeHourPoint.temperature_2m)
    : currentWeather
    ? Math.round(currentWeather.temperature_2m)
    : "--";

  const displayWeatherCode = activeHourPoint ? activeHourPoint.weather_code : currentWeather?.weather_code ?? 0;
  const isDay = currentWeather?.is_day === 1;

  // Generate an authentic editorial journal sentence from real data
  const journalSentence = currentWeather
    ? `${currentWeather.weather_description} conditions across ${selectedLocation.name}. ` +
      `The atmosphere holds a relative humidity of ${currentWeather.relative_humidity_2m}% with a ` +
      `${currentWeather.wind_speed_10m} km/h wind blowing from ${currentWeather.wind_direction_10m ?? 0}°.`
    : "Select a location to inspect genuine atmospheric telemetry.";

  return (
    <main className="relative min-h-screen text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-sky-500/30">
      {/* 1. Atmospheric Canvas Substrate */}
      <AtmosphericSkyScene
        palette={palette}
        cloudCover={currentWeather ? (currentWeather.weather_code >= 2 ? 70 : 15) : 30}
        windSpeed={currentWeather?.wind_speed_10m ?? 10}
        className="fixed inset-0 z-0"
      />

      {/* 2. Top Editorial Bar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 backdrop-blur-md transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-white">SkyGuard</span>
            <span className="text-slate-500">/</span>
            <span className="text-xs font-mono tracking-widest uppercase text-sky-400">The Living Sky</span>
          </div>
        </div>

        {/* Global Location Search Input */}
        <div className="w-full sm:w-auto sm:min-w-[340px]">
          <LivingLocationSearch
            onSelectLocation={(loc) => setSelectedLocation(loc)}
            selectedLocationName={selectedLocation.name}
          />
        </div>
      </header>

      {/* 3. Center Stage: The Atmospheric Hero Experience */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="text-center py-20">
            <span className="inline-block w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-xs font-mono uppercase tracking-widest text-slate-400">
              Synchronizing with Troposphere...
            </p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto p-6 bg-red-950/40 border border-red-800/60 rounded-2xl backdrop-blur-md text-center">
            <ShieldAlert className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-red-200">Meteorological Service Degraded</h3>
            <p className="mt-2 text-xs text-red-300/80">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            {/* Spatial Location Title & Coordinates */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-700/50 backdrop-blur-md shadow-sm mb-4">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-mono uppercase tracking-widest text-slate-300">
                {selectedLocation.name}, {selectedLocation.country}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                ({selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°)
              </span>
            </div>

            {/* Grand Editorial Display Temperature & Living Condition Glyph */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 my-2">
              <span className="text-7xl sm:text-9xl font-light tracking-tighter tabular-nums text-white drop-shadow-md">
                {displayTemperature}°
              </span>
              <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md shadow-xl">
                <LivingWeatherIcon code={displayWeatherCode} isDay={isDay} size={64} />
              </div>
            </div>

            {/* Condition Summary Tag */}
            <h1 className="text-xl sm:text-2xl font-normal text-slate-200 mt-2">
              {currentWeather?.weather_description ?? "Atmospheric Conditions"}
            </h1>

            {/* Editorial Atmospheric Journal Prose */}
            <p className="max-w-xl text-sm sm:text-base text-slate-300/90 leading-relaxed mt-3 font-normal">
              {journalSentence}
            </p>

            {/* Key Atmospheric Telemetry Micro-Pills */}
            {currentWeather && (
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6">
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  <span>{currentWeather.wind_speed_10m} km/h wind</span>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>{currentWeather.relative_humidity_2m}% humidity</span>
                </div>
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span>Apparent: {Math.round(currentWeather.apparent_temperature)}°</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Lower Anchor: The Tactile 24-Hour Forecast Scrubber */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8 pt-4">
        {weatherData?.hourly && weatherData.hourly.length > 0 && (
          <InteractiveTimelineScrubber
            hourly={weatherData.hourly}
            selectedIndex={selectedHourIndex}
            onSelectIndex={(idx) => setSelectedHourIndex(idx)}
            timezone={weatherData.timezone}
          />
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 mt-4 px-2 gap-2">
          <span>Provenance: Open-Meteo Multi-Model Ensemble • Zero Synthetic Data</span>
          <span>SkyGuard — The Living Sky Proof of Concept</span>
        </div>
      </footer>
    </main>
  );
}
