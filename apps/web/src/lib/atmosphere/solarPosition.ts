/**
 * SkyGuard Atmospheric Engine - Astronomical Solar & Lunar Position Calculator
 * Implements rigorous astronomical formulas to compute exact solar elevation,
 * azimuth, solar phase, and celestial coordinates for any latitude, longitude, and UTC timestamp.
 * Zero-fabrication: derives phase from celestial physics, not machine local time or city names.
 */

import { SolarPhase, SolarPosition } from "./weatherSceneTypes";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Known reference New Moon epoch (2000-01-06 18:14 UTC)
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH_MS = 29.530588853 * 86400 * 1000;

export function calculateSolarPosition(
  latitude: number,
  longitude: number,
  utcDate: Date
): SolarPosition {
  const timeMs = utcDate.getTime();
  
  // Julian Date
  const jd = timeMs / 86400000 + 2440587.5;
  const n = jd - 2451545.0; // Days since J2000.0

  // Mean solar longitude (degrees)
  let L = (280.460 + 0.9856474 * n) % 360;
  if (L < 0) L += 360;

  // Mean anomaly of the Sun (degrees)
  let g = (357.528 + 0.9856003 * n) % 360;
  if (g < 0) g += 360;
  const gRad = g * DEG2RAD;

  // Ecliptic longitude of the Sun (degrees)
  const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
  const lambdaRad = lambda * DEG2RAD;

  // Obliquity of the ecliptic (degrees)
  const epsilon = 23.439 - 0.0000004 * n;
  const epsilonRad = epsilon * DEG2RAD;

  // Right Ascension (alpha) and Declination (delta)
  const sinDelta = Math.sin(epsilonRad) * Math.sin(lambdaRad);
  const cosDelta = Math.sqrt(1 - sinDelta * sinDelta);
  const deltaRad = Math.asin(sinDelta);

  const sinAlpha = Math.cos(epsilonRad) * Math.sin(lambdaRad);
  const cosAlpha = Math.cos(lambdaRad);
  let alphaRad = Math.atan2(sinAlpha, cosAlpha);
  if (alphaRad < 0) alphaRad += 2 * Math.PI;

  // Greenwich Mean Sidereal Time (degrees)
  const d = n;
  let gmst = (280.46061837 + 360.98564736629 * d) % 360;
  if (gmst < 0) gmst += 360;

  // Local Sidereal Time (degrees -> radians)
  let lstDeg = (gmst + longitude) % 360;
  if (lstDeg < 0) lstDeg += 360;
  const lstRad = lstDeg * DEG2RAD;

  // Local Hour Angle (H)
  let H = lstRad - alphaRad;
  while (H < -Math.PI) H += 2 * Math.PI;
  while (H > Math.PI) H -= 2 * Math.PI;

  // Observer coordinates
  const phiRad = latitude * DEG2RAD;

  // Solar Elevation (h)
  const sinH = Math.sin(phiRad) * Math.sin(deltaRad) + Math.cos(phiRad) * Math.cos(deltaRad) * Math.cos(H);
  const elevationRad = Math.asin(Math.max(-1, Math.min(1, sinH)));
  const elevationDeg = elevationRad * RAD2DEG;

  // Solar Azimuth (A) measured from North clockwise (0 to 360)
  const cosH = Math.cos(elevationRad);
  let azimuthDeg = 180;
  if (Math.abs(cosH) > 1e-6) {
    const sinA = -Math.cos(deltaRad) * Math.sin(H) / cosH;
    const cosA = (Math.sin(deltaRad) - Math.sin(phiRad) * sinH) / (Math.cos(phiRad) * cosH);
    azimuthDeg = Math.atan2(sinA, cosA) * RAD2DEG;
    if (azimuthDeg < 0) azimuthDeg += 360;
  }

  // Classify Solar Phase strictly based on physical solar elevation:
  // - elevation > 6°: Day
  // - 0° <= elevation <= 6°: Sunrise (morning azimuth < 180°) or Sunset (evening azimuth >= 180°)
  // - -6° <= elevation < 0°: Civil Twilight
  // - -12° <= elevation < -6°: Nautical Twilight
  // - elevation < -12°: Night
  let phase: SolarPhase;
  if (elevationDeg > 6) {
    phase = "day";
  } else if (elevationDeg >= 0) {
    phase = azimuthDeg < 180 ? "sunrise" : "sunset";
  } else if (elevationDeg >= -12) {
    phase = "twilight";
  } else {
    phase = "night";
  }

  // Normalized zenith progress: 0 (dawn) -> 0.5 (solar noon) -> 1 (dusk)
  // When night: mapped to 0 or 1
  let zenithProgress = 0.5;
  if (phase === "day" || phase === "sunrise" || phase === "sunset") {
    // Map hour angle from -PI/2 (morning horizon) to +PI/2 (evening horizon)
    zenithProgress = Math.max(0, Math.min(1, (H + Math.PI / 2) / Math.PI));
  } else {
    zenithProgress = H < 0 ? 0 : 1;
  }

  // Parabolic screen coordinate (constrained to upper central sky zone: x: 0.40 to 0.60, y: 0.12 to 0.28)
  // Ensures celestial disc hovers gracefully in open sky above cloud, never obscuring text or metrics
  let screenX = 0.5;
  let screenY = 0.20;
  if (elevationDeg > -10) {
    // Sun trajectory across upper central atmosphere
    const normalizedAzimuthProgress = Math.max(0, Math.min(1, (azimuthDeg - 60) / 240));
    screenX = 0.40 + normalizedAzimuthProgress * 0.20;
    const peakElevation = Math.max(elevationDeg, 0);
    screenY = Math.max(0.12, 0.26 - (peakElevation / 90) * 0.14);
  } else {
    // Moon trajectory in upper central nocturnal sky
    const moonProgress = ((H + Math.PI) / (2 * Math.PI)) % 1;
    screenX = 0.42 + moonProgress * 0.16;
    screenY = 0.14 + Math.abs(moonProgress - 0.5) * 0.12;
  }

  // Lunar Phase Fraction (0.0 New Moon -> 0.5 Full Moon -> 1.0 Waning)
  const lunarPhaseFraction = ((timeMs - KNOWN_NEW_MOON_MS) % SYNODIC_MONTH_MS) / SYNODIC_MONTH_MS;

  return {
    elevation: elevationDeg,
    azimuth: azimuthDeg,
    phase,
    zenithProgress,
    screenPosition: { x: screenX, y: screenY },
    lunarPhaseFraction: lunarPhaseFraction >= 0 ? lunarPhaseFraction : lunarPhaseFraction + 1,
  };
}
