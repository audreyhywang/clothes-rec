"use client";

import { useState } from "react";
import { MapPin, Loader2, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchWeatherByCoords,
  searchCity,
  type CitySearchResult,
  type WeatherSnapshot,
} from "@/lib/weather";

export function WeatherWidget({
  weather,
  onWeatherChange,
}: {
  weather: WeatherSnapshot | null;
  onWeatherChange: (weather: WeatherSnapshot | null) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [showCitySearch, setShowCitySearch] = useState(false);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { tempC, condition } = await fetchWeatherByCoords(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          onWeatherChange({ tempC, condition, locationName: "目前位置" });
          setStatus("idle");
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
      { timeout: 10_000 },
    );
  }

  async function runCitySearch() {
    if (!cityQuery.trim()) return;
    setStatus("loading");
    try {
      const results = await searchCity(cityQuery.trim());
      setCityResults(results);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function pickCity(city: CitySearchResult) {
    setStatus("loading");
    try {
      const { tempC, condition } = await fetchWeatherByCoords(city.latitude, city.longitude);
      onWeatherChange({ tempC, condition, locationName: city.name });
      setShowCitySearch(false);
      setCityResults([]);
      setCityQuery("");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  if (weather) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
        <span className="flex items-center gap-2">
          <CloudSun className="size-4 text-primary" />
          {weather.locationName} · {weather.tempC}°C · {weather.condition}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onWeatherChange(null)}>
          清除
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">加入天氣資訊，建議會一併考慮氣溫與天氣狀況</p>
        <Button variant="outline" size="sm" onClick={useCurrentLocation} disabled={status === "loading"}>
          {status === "loading" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <MapPin className="size-3.5" />
          )}
          使用目前位置
        </Button>
      </div>

      {status === "error" && (
        <p className="text-xs text-destructive">
          無法取得位置或天氣資料，請確認已允許定位權限，或改用下方手動搜尋城市。
        </p>
      )}

      {!showCitySearch ? (
        <Button variant="ghost" size="sm" className="justify-start px-0" onClick={() => setShowCitySearch(true)}>
          改用手動輸入城市
        </Button>
      ) : (
        <div className="grid gap-2">
          <div className="flex gap-2">
            <Input
              placeholder="輸入城市名稱，例如：台北"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runCitySearch()}
            />
            <Button variant="outline" size="sm" onClick={runCitySearch} disabled={status === "loading"}>
              搜尋
            </Button>
          </div>
          {cityResults.length > 0 && (
            <div className="grid gap-1">
              {cityResults.map((city, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickCity(city)}
                  className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {city.name}
                  {city.admin1 ? `，${city.admin1}` : ""}
                  {city.country ? `（${city.country}）` : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
