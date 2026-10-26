"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RefreshNewsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/fashion-news");
      if (!res.ok) throw new Error("更新失敗");
      const data = await res.json();
      toast.success(`已更新：新增 ${data.inserted} 篇，略過 ${data.skipped} 篇重複`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "更新中…" : "立即更新"}
    </Button>
  );
}
