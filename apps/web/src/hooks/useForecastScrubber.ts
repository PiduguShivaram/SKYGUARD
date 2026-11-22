"use client";

import { useState, useCallback, useMemo } from "react";
import { HourlyForecastPoint } from "@/types";

export function useForecastScrubber(hourlyData: HourlyForecastPoint[] | null) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  const hoursAvailable = useMemo(() => {
    return hourlyData?.length || 0;
  }, [hourlyData]);

  const activeHourData = useMemo(() => {
    if (!hourlyData || hoursAvailable === 0) return null;
    const idx = Math.min(Math.max(selectedIndex, 0), hoursAvailable - 1);
    const item = hourlyData[idx];
    return {
      index: idx,
      time: item.time,
      temperature: item.temperature_2m,
      precipitationProbability: item.precipitation_probability ?? 0,
      weatherCode: item.weather_code ?? 0,
      windSpeed: item.wind_speed_10m ?? 0,
    };
  }, [hourlyData, hoursAvailable, selectedIndex]);

  const scrubToRatio = useCallback(
    (ratio: number) => {
      if (hoursAvailable === 0) return;
      const clamped = Math.max(0, Math.min(1, ratio));
      const targetIndex = Math.round(clamped * (hoursAvailable - 1));
      setSelectedIndex(targetIndex);
    },
    [hoursAvailable]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    isScrubbing,
    setIsScrubbing,
    activeHourData,
    scrubToRatio,
    totalHours: hoursAvailable,
  };
}
