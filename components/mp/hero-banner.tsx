import Image from "next/image"

export function HeroBanner() {
  return (
    <section className="px-4 pt-2">
      <div className="relative overflow-hidden rounded-sm">
        <div className="relative aspect-[4/5] w-full">
          <Image
            src="/hero-celadon.jpg"
            alt="青瓷釉色细节"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 480px) 100vw, 480px"
          />
          {/* 柔和渐变提升文字可读性 */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />

          {/* 竖排书法感标题 */}
          <div className="absolute left-6 top-6 flex flex-col items-start">
            <span className="mb-3 h-8 w-px bg-foreground/40" />
            <h1 className="font-serif text-[11px] tracking-[0.5em] text-foreground/70">EST. 2019</h1>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px w-6 bg-foreground/60" />
              <span className="font-serif text-[10px] tracking-[0.4em] text-foreground/70">壹 · 春季雅集</span>
            </div>
            <h2 className="font-serif text-3xl leading-tight tracking-wide text-foreground text-balance">
              青釉映月
              <br />
              一器一境
            </h2>
            <p className="mt-2 max-w-[70%] font-serif text-[12px] leading-relaxed tracking-wider text-foreground/60 text-pretty">
              取自龙泉山土，手作柴烧，见素抱朴。
            </p>
          </div>

          {/* 指示器 */}
          <div className="absolute bottom-5 right-5 flex items-center gap-1">
            <span className="h-px w-4 bg-foreground/70" />
            <span className="font-mono text-[10px] tracking-widest text-foreground/70">01 / 04</span>
          </div>
        </div>
      </div>
    </section>
  )
}
