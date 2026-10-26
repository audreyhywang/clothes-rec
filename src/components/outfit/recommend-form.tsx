"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, ImagePlus, Shirt, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { OutfitRecommendation } from "@/lib/ai/recommend";
import { sheinSearchUrl } from "@/lib/shein";
import { WeatherWidget } from "@/components/outfit/weather-widget";
import type { WeatherSnapshot } from "@/lib/weather";
import { resizeImageToDataUrl } from "@/lib/image-resize";

const CATEGORY_LABEL: Record<string, string> = {
  top: "上衣",
  bottom: "下身",
  dress: "洋裝",
  outerwear: "外套",
  shoes: "鞋履",
  accessory: "配件",
};

type Mode = "garment" | "wardrobe";

interface WardrobeItem {
  id: string;
  category: string;
  color: string;
  imageUrl: string | null;
}

function loadWardrobe(
  setItems: (items: WardrobeItem[]) => void,
  setUnlocked: (v: boolean) => void,
) {
  fetch("/api/wardrobe")
    .then((res) => res.json())
    .then((data) => {
      setItems(data.items ?? []);
      setUnlocked(Boolean(data.unlocked));
    })
    .catch(() => {});
}

export function RecommendForm() {
  const [mode, setMode] = useState<Mode>("garment");
  const [activity, setActivity] = useState("");
  const [mood, setMood] = useState("");
  const [garmentImage, setGarmentImage] = useState<string | null>(null);
  const [resizingImage, setResizingImage] = useState(false);
  const [savingToWardrobe, setSavingToWardrobe] = useState(false);
  const [wardrobeSaved, setWardrobeSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutfitRecommendation | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [wardrobeUnlocked, setWardrobeUnlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWardrobe(setWardrobeItems, setWardrobeUnlocked);
  }, []);

  const wardrobeById = new Map(wardrobeItems.map((item) => [item.id, item]));

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResizingImage(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setGarmentImage(dataUrl);
      setWardrobeSaved(false);
    } catch {
      toast.error("圖片處理失敗，請換一張照片試試");
    } finally {
      setResizingImage(false);
      e.target.value = "";
    }
  }

  async function handleAddToWardrobe() {
    if (!garmentImage) return;
    setSavingToWardrobe(true);
    try {
      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: garmentImage }),
      });
      if (!res.ok) throw new Error("加入衣櫃失敗，請再試一次");
      const data = await res.json();
      setWardrobeSaved(true);
      toast.success(`已加入衣櫃：${CATEGORY_LABEL[data.item.category] ?? data.item.category} · ${data.item.color}`);
      loadWardrobe(setWardrobeItems, setWardrobeUnlocked);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setSavingToWardrobe(false);
    }
  }

  async function handleSubmit() {
    if (mode === "garment" && !garmentImage && !activity.trim()) {
      toast.error("請上傳單品照片，或至少填寫今天的活動");
      return;
    }
    if (mode === "wardrobe" && !wardrobeUnlocked) {
      toast.error("衣櫃還不符合開啟條件");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const weatherPayload = weather
        ? { tempC: weather.tempC, condition: weather.condition }
        : undefined;

      const payload = {
        mode,
        imageDataUrl: mode === "garment" ? garmentImage ?? undefined : undefined,
        activity: activity || undefined,
        mood: mood || undefined,
        weather: weatherPayload,
      };

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === "string" ? data.error : "建議產生失敗，請稍後再試");
      }
      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>穿搭建議</CardTitle>
          <CardDescription>
            今天的活動與心情，是每次搭配最重要的依據——再加上單品照片或衣櫃，讓建議更精準。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 rounded-lg border p-3">
            <p className="text-sm font-medium">今天的活動與心情</p>
            <div className="grid gap-1.5">
              <Label htmlFor="activity">活動</Label>
              <Input
                id="activity"
                placeholder="例如：和朋友喝咖啡、上班開會、週末約會"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mood">心情</Label>
              <Textarea
                id="mood"
                placeholder="例如：想輕鬆自在一點、想展現自信、慵懶放鬆"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              />
            </div>
          </div>

          <WeatherWidget weather={weather} onWeatherChange={setWeather} />

          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="garment">依單品照片</TabsTrigger>
              <TabsTrigger value="wardrobe">依衣櫃搭配</TabsTrigger>
            </TabsList>

            <TabsContent value="garment" className="grid gap-3 pt-4">
              <Label>單品照片（選填）</Label>
              <p className="text-xs text-muted-foreground">
                有想搭配的單品可以拍照上傳，我們會自動辨識款式；不拍也沒關係，直接用上面的活動與心情幫你設計整套穿搭。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {garmentImage ? (
                <div className="flex items-start gap-3">
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                    <img
                      src={garmentImage}
                      alt="已上傳的單品照片"
                      className="h-48 w-48 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGarmentImage(null);
                        setWardrobeSaved(false);
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background shadow"
                      aria-label="移除照片"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddToWardrobe}
                    disabled={savingToWardrobe || wardrobeSaved}
                  >
                    {wardrobeSaved ? (
                      <>
                        <Check className="size-3.5" />
                        已加入衣櫃
                      </>
                    ) : savingToWardrobe ? (
                      "加入中…"
                    ) : (
                      "加入衣櫃"
                    )}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={resizingImage}
                  className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/50"
                >
                  <ImagePlus className="size-6" />
                  <span className="text-xs">{resizingImage ? "處理中…" : "點擊上傳照片"}</span>
                </button>
              )}
            </TabsContent>

            <TabsContent value="wardrobe" className="grid gap-4 pt-4">
              {!wardrobeUnlocked ? (
                <div className="grid gap-2 rounded-lg border border-dashed p-4 text-center">
                  <Shirt className="mx-auto size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    衣櫃至少需要 1 件上衣（或洋裝）和 1 件下身才能使用這個功能，目前衣櫃有{" "}
                    {wardrobeItems.length} 件。
                  </p>
                  <a
                    href="/wardrobe"
                    className={buttonVariants({ variant: "outline", size: "sm", className: "mx-auto w-fit" })}
                  >
                    前往我的衣櫃新增單品
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  我們會從你的衣櫃（{wardrobeItems.length} 件）挑選最適合上面活動與心情的組合，缺少的類別才會另外建議購買。
                </p>
              )}
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleSubmit}
            disabled={loading || resizingImage || (mode === "wardrobe" && !wardrobeUnlocked)}
          >
            {loading ? "生成建議中…" : "取得穿搭建議"}
          </Button>

          {result && (
            <>
              <Separator />
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">{result.styleSummary}</p>
                <div className="flex flex-wrap gap-2">
                  {result.palette.map((color) => (
                    <Badge key={color.name} variant="secondary" className="gap-1.5">
                      <span
                        className="size-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </Badge>
                  ))}
                </div>

                {result.identifiedGarment && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-medium">
                      我們辨識出：{CATEGORY_LABEL[result.identifiedGarment.category]} ·{" "}
                      {result.identifiedGarment.color} · {result.identifiedGarment.silhouette}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.identifiedGarment.description}
                    </p>
                  </div>
                )}

                <div className="grid gap-3">
                  {result.pieces.map((piece, i) => {
                    const owned = piece.wardrobeItemId ? wardrobeById.get(piece.wardrobeItemId) : undefined;
                    return (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        {owned?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local data URL
                          <img
                            src={owned.imageUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-md border object-cover"
                          />
                        ) : (
                          <span
                            className="mt-0.5 h-5 w-5 shrink-0 rounded-full border"
                            style={{ backgroundColor: piece.colorHex }}
                          />
                        )}
                        <div className="grid flex-1 gap-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {CATEGORY_LABEL[piece.category] ?? piece.category} · {piece.color} ·{" "}
                              {piece.silhouette}
                            </p>
                            {piece.wardrobeItemId ? (
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                你的衣櫃
                              </Badge>
                            ) : (
                              <a
                                href={sheinSearchUrl(piece.searchQuery)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 text-xs text-primary underline underline-offset-2"
                              >
                                看款式 <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{piece.reasoning}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {result.avoid.length > 0 && (
                  <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">避免：</p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {result.avoid.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
