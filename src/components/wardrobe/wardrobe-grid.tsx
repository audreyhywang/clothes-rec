"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resizeImageToDataUrl } from "@/lib/image-resize";

const CATEGORY_LABEL: Record<string, string> = {
  top: "上衣",
  bottom: "下身",
  dress: "洋裝",
  outerwear: "外套",
  shoes: "鞋履",
  accessory: "配件",
};

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  color: string;
  pattern: string | null;
  silhouette: string | null;
  imageUrl: string | null;
}

export function WardrobeGrid() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/wardrobe");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast.error("無法載入衣櫃");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    loadItems();
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      if (!res.ok) throw new Error("辨識或儲存失敗，請再試一次");
      const data = await res.json();
      setItems((prev) => [data.item, ...prev]);
      toast.success(`已加入衣櫃：${CATEGORY_LABEL[data.item.category] ?? data.item.category} · ${data.item.color}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("刪除失敗");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setDeletingId(null);
    }
  }

  const hasTop = items.some((item) => item.category === "top" || item.category === "dress");
  const hasBottom = items.some((item) => item.category === "bottom" || item.category === "dress");
  const unlocked = hasTop && hasBottom;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">我的衣櫃</h1>
          <p className="text-sm text-muted-foreground">
            {unlocked
              ? "已解鎖「依衣櫃搭配」，去穿搭建議頁試試看吧！"
              : "再加入上衣和下身各至少一件，就能解鎖「依衣櫃搭配」功能"}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {uploading ? "辨識中…" : "新增單品"}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">載入中…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            衣櫃還是空的，點右上角「新增單品」拍張照片開始建立吧。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden p-0">
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL
                <img src={item.imageUrl} alt={item.name} className="aspect-square w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="absolute right-1.5 top-1.5 rounded-full bg-foreground/80 p-1.5 text-background opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="刪除"
              >
                <Trash2 className="size-3.5" />
              </button>
              <CardContent className="grid gap-1 p-2.5">
                <Badge variant="secondary" className="w-fit text-xs">
                  {CATEGORY_LABEL[item.category] ?? item.category}
                </Badge>
                <p className="truncate text-xs text-muted-foreground">
                  {item.color}
                  {item.silhouette ? ` · ${item.silhouette}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
