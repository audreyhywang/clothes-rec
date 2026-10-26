/**
 * Open-Meteo (open-meteo.com) — free, no API key, no signup, CORS-enabled
 * for direct browser calls. Used for current temperature + conditions to
 * factor into outfit recommendations.
 */

export interface WeatherSnapshot {
  tempC: number;
  condition: string;
  locationName: string;
}

export interface CitySearchResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

// WMO weather codes -> plain-language condition, per
// https://open-meteo.com/en/docs#weathervariables
const WEATHER_CODE_TEXT: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "局部多雲",
  3: "陰天",
  45: "起霧",
  48: "霧淞",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "毛毛雨",
  56: "凍雨",
  57: "凍雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "凍雨",
  67: "凍雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "陣雪粒",
  80: "短暫陣雨",
  81: "陣雨",
  82: "強陣雨",
  85: "陣雪",
  86: "強陣雪",
  95: "雷雨",
  96: "雷雨伴冰雹",
  99: "雷雨伴冰雹",
};

export function weatherCodeToText(code: number): string {
  return WEATHER_CODE_TEXT[code] ?? "天氣狀況不明";
}

export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
): Promise<{ tempC: number; condition: string }> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("無法取得天氣資料");
  const data = await res.json();

  return {
    tempC: Math.round(data.current.temperature_2m),
    condition: weatherCodeToText(data.current.weather_code),
  };
}

// Open-Meteo's geocoding search only matches romanized names (its index is
// English-keyed) — a bare "台北" returns zero results even though the API
// happily returns Chinese names in the response via language=zh. Pre-
// translate common Taiwan city names so the common case still works.
const CITY_NAME_TO_EN: Record<string, string> = {
  台北: "Taipei",
  臺北: "Taipei",
  新北: "New Taipei",
  桃園: "Taoyuan",
  台中: "Taichung",
  臺中: "Taichung",
  台南: "Tainan",
  臺南: "Tainan",
  高雄: "Kaohsiung",
  基隆: "Keelung",
  新竹: "Hsinchu",
  嘉義: "Chiayi",
  宜蘭: "Yilan",
  花蓮: "Hualien",
  台東: "Taitung",
  臺東: "Taitung",
  南投: "Nantou",
  彰化: "Changhua",
  雲林: "Yunlin",
  屏東: "Pingtung",
  澎湖: "Penghu",
  金門: "Kinmen",
};

// Open-Meteo/GeoNames returns the `country` field in Simplified Chinese
// even when asked for `language=zh` (e.g. "台湾" instead of "台灣") — this
// app is Traditional Chinese throughout, so country names are normalized
// here by country_code rather than trusted as-is. Falls back to the raw
// API value for anything not in this list.
const COUNTRY_CODE_TO_ZH_HANT: Record<string, string> = {
  TW: "台灣",
  CN: "中國",
  HK: "香港",
  MO: "澳門",
  JP: "日本",
  KR: "韓國",
  US: "美國",
  GB: "英國",
  CA: "加拿大",
  AU: "澳洲",
  NZ: "紐西蘭",
  SG: "新加坡",
  MY: "馬來西亞",
  TH: "泰國",
  VN: "越南",
  PH: "菲律賓",
  ID: "印尼",
  FR: "法國",
  DE: "德國",
  IT: "義大利",
  ES: "西班牙",
  NL: "荷蘭",
  CH: "瑞士",
};

export async function searchCity(query: string): Promise<CitySearchResult[]> {
  const translated = CITY_NAME_TO_EN[query.trim()] ?? query;

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", translated);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "zh");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("搜尋城市失敗");
  const data = await res.json();

  return (data.results ?? []).map(
    (r: {
      name: string;
      admin1?: string;
      country?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
    }) => ({
      name: r.name,
      // Taiwan's counties/cities are themselves the top-level division —
      // GeoNames' "Taiwan Province" admin1 label is defunct and not how
      // Taiwan organizes itself, so never show it.
      admin1: r.country_code === "TW" ? undefined : r.admin1,
      country: (r.country_code && COUNTRY_CODE_TO_ZH_HANT[r.country_code]) ?? r.country,
      latitude: r.latitude,
      longitude: r.longitude,
    }),
  );
}
