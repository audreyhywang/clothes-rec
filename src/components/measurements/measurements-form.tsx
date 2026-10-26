"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AvatarViewer } from "@/components/avatar/avatar-viewer";

export interface MeasurementFormValues {
  heightCm: string;
  weightKg: string;
  bustCm: string;
  waistCm: string;
  hipCm: string;
  shoulderCm: string;
  inseamCm: string;
  bodyShape: string;
  gender: string;
}

const BODY_SHAPES = [
  { value: "hourglass", label: "沙漏型" },
  { value: "pear", label: "梨型" },
  { value: "apple", label: "蘋果型" },
  { value: "rectangle", label: "直筒型" },
  { value: "inverted_triangle", label: "倒三角型" },
];

const GENDERS = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "unspecified", label: "不指定" },
];

const FIELD_META: { key: keyof MeasurementFormValues; label: string; placeholder: string }[] = [
  { key: "heightCm", label: "身高 (cm)", placeholder: "165" },
  { key: "weightKg", label: "體重 (kg)", placeholder: "選填" },
  { key: "bustCm", label: "胸圍 (cm)", placeholder: "88" },
  { key: "waistCm", label: "腰圍 (cm)", placeholder: "70" },
  { key: "hipCm", label: "臀圍 (cm)", placeholder: "94" },
  { key: "shoulderCm", label: "肩寬 (cm)", placeholder: "38" },
  { key: "inseamCm", label: "腿長 (cm)", placeholder: "選填，胯下到腳踝" },
];

export function MeasurementsForm({
  initial,
}: {
  initial: Partial<MeasurementFormValues>;
}) {
  const [values, setValues] = useState<MeasurementFormValues>({
    heightCm: initial.heightCm ?? "",
    weightKg: initial.weightKg ?? "",
    bustCm: initial.bustCm ?? "",
    waistCm: initial.waistCm ?? "",
    hipCm: initial.hipCm ?? "",
    shoulderCm: initial.shoulderCm ?? "",
    inseamCm: initial.inseamCm ?? "",
    bodyShape: initial.bodyShape ?? "",
    gender: initial.gender ?? "",
  });
  const [saving, setSaving] = useState(false);

  const previewMeasurements = useMemo(
    () => ({
      heightCm: Number(values.heightCm) || 165,
      bustCm: values.bustCm ? Number(values.bustCm) : undefined,
      waistCm: values.waistCm ? Number(values.waistCm) : undefined,
      hipCm: values.hipCm ? Number(values.hipCm) : undefined,
      shoulderCm: values.shoulderCm ? Number(values.shoulderCm) : undefined,
      legLengthCm: values.inseamCm ? Number(values.inseamCm) : undefined,
    }),
    [values],
  );

  function update<K extends keyof MeasurementFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.heightCm) {
      toast.error("請至少輸入身高");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: Number(values.heightCm),
          weightKg: values.weightKg ? Number(values.weightKg) : undefined,
          bustCm: values.bustCm ? Number(values.bustCm) : undefined,
          waistCm: values.waistCm ? Number(values.waistCm) : undefined,
          hipCm: values.hipCm ? Number(values.hipCm) : undefined,
          shoulderCm: values.shoulderCm ? Number(values.shoulderCm) : undefined,
          inseamCm: values.inseamCm ? Number(values.inseamCm) : undefined,
          bodyShape: values.bodyShape || undefined,
          gender: values.gender || undefined,
        }),
      });
      if (!res.ok) throw new Error("儲存失敗");
      toast.success("身材資料已儲存，立體人形已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>身材資料</CardTitle>
          <CardDescription>
            輸入你的身材數值，我們會用來打造專屬的立體人形，並讓穿搭建議更貼合你的身形。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {FIELD_META.map((field) => (
                <div key={field.key} className="grid gap-1.5">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type="number"
                    inputMode="decimal"
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>體型</Label>
                <Select value={values.bodyShape} onValueChange={(v) => update("bodyShape", v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇最接近的體型" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_SHAPES.map((shape) => (
                      <SelectItem key={shape.value} value={shape.value}>
                        {shape.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>性別</Label>
                <Select value={values.gender} onValueChange={(v) => update("gender", v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="選填" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="mt-2">
              {saving ? "儲存中…" : "儲存並更新立體人形"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>立體人形預覽</CardTitle>
          <CardDescription>拖曳可旋轉視角，數值變動即時反映在體型上。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[420px] w-full bg-muted/30">
            <AvatarViewer measurements={previewMeasurements} className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
