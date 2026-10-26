import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FEATURES = [
  {
    href: "/recommend",
    title: "穿搭建議",
    description: "依今日活動與心情、拍一張單品照片，或直接從衣櫃搭配，推薦顏色與版型。",
    cta: "開始搭配",
  },
  {
    href: "/wardrobe",
    title: "我的衣櫃",
    description: "拍照建立你的衣櫃，AI 自動辨識款式，累積足夠單品後可直接用擁有的衣服搭配。",
    cta: "建立衣櫃",
  },
  {
    href: "/measurements",
    title: "身材資料",
    description: "輸入身材數值，打造貼合你體型的人形預覽，讓建議更準確。",
    cta: "填寫資料",
  },
  {
    href: "/news",
    title: "時尚資訊",
    description: "AI 代理定期追蹤時尚新聞，彙整成好讀的趨勢摘要。",
    cta: "查看趨勢",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <section className="mb-16 text-center">
        <p className="mb-3 text-sm font-medium text-primary">穿搭顧問 · Style Advisor</p>
        <h1 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          為每一天的自己，找到最適合的穿搭
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          告訴我們今天的活動與心情、拍一張單品照片，或直接從你的衣櫃搭配，
          我們會給你實際可行的顏色與版型建議。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/recommend" className={buttonVariants({ size: "lg" })}>
            立即取得穿搭建議
          </Link>
          <Link href="/measurements" className={buttonVariants({ variant: "outline", size: "lg" })}>
            先建立我的身材資料
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <Card key={feature.href} className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-base">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={feature.href}
                className={buttonVariants({ variant: "ghost", size: "sm", className: "px-0" })}
              >
                {feature.cta} →
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
