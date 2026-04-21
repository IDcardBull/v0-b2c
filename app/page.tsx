import { StatusBar } from "@/components/mp/status-bar"
import { TopBar } from "@/components/mp/top-bar"
import { BrandHeader } from "@/components/mp/brand-header"
import { HeroBanner } from "@/components/mp/hero-banner"
import { Categories } from "@/components/mp/categories"
import { ProductGrid } from "@/components/mp/product-grid"
import { TabBar } from "@/components/mp/tab-bar"

export default function Page() {
  return (
    <main className="min-h-dvh w-full bg-secondary/40">
      {/* 桌面下的装裱：居中的小程序画框 */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col">
        <div className="relative flex-1 overflow-hidden bg-background shadow-[0_1px_0_rgba(0,0,0,0.04)] md:my-6 md:rounded-[28px] md:border md:border-foreground/10 md:shadow-2xl">
            {/* 可滚动内容 */}
            <div className="no-scrollbar h-[100dvh] overflow-y-auto md:h-[860px]">
              <StatusBar />
              <TopBar />
              <BrandHeader />
              <HeroBanner />
              <Categories />

              {/* 雅集 · 文化短语分隔 */}
              <div className="mt-10 px-4">
                <div className="flex items-center gap-3 border-y border-foreground/10 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/30">
                    <span className="font-serif text-[11px] tracking-widest text-accent">茗</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-serif text-[12px] tracking-[0.25em] text-foreground">
                      《春山煎茶》
                    </p>
                    <p className="mt-0.5 font-serif text-[10px] tracking-widest text-muted-foreground">
                      本期雅集 · 由陶艺家 李怀之 主理
                    </p>
                  </div>
                  <span className="font-serif text-[10px] tracking-[0.3em] text-muted-foreground">
                    入 席 →
                  </span>
                </div>
              </div>

              <ProductGrid />
              <div className="h-16" />
            </div>

            {/* 底部 Tab 悬浮 */}
            <TabBar />
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  )
}
