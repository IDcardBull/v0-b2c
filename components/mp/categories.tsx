type Category = {
  name: string
  en: string
  icon: React.ReactNode
}

// 简约中式线描图标：自绘 SVG，保持器物感
const TeaIcon = () => (
  <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M12 20h20c0 7-4 14-10 14s-10-7-10-14z" strokeLinejoin="round" />
    <path d="M32 22c4 0 6 2 6 5s-2 5-6 5" strokeLinecap="round" />
    <path d="M18 16c0-2 1-4 3-4M24 16c0-2 1-4 3-4" strokeLinecap="round" />
    <path d="M10 38h26" strokeLinecap="round" />
  </svg>
)

const VaseIcon = () => (
  <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M20 10h8v4l3 4c2 3 3 6 3 10 0 6-4 10-10 10s-10-4-10-10c0-4 1-7 3-10l3-4v-4z" strokeLinejoin="round" />
    <path d="M19 10h10" strokeLinecap="round" />
    <path d="M22 6c0 2-2 2-2 4M26 6c0 2 2 2 2 4" strokeLinecap="round" />
  </svg>
)

const IncenseIcon = () => (
  <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M10 28c0-4 6-7 14-7s14 3 14 7v2c0 4-6 7-14 7s-14-3-14-7v-2z" strokeLinejoin="round" />
    <path d="M14 28h20" />
    <path d="M18 21v-4M30 21v-4" strokeLinecap="round" />
    <path d="M24 14c0-2-2-3-2-5s2-3 2-5M20 10c0 1-1 2 0 3M28 10c0 1 1 2 0 3" strokeLinecap="round" />
  </svg>
)

const ArtIcon = () => (
  <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="24" cy="22" r="10" />
    <path d="M24 12c-4 4-4 16 0 20M24 12c4 4 4 16 0 20" />
    <path d="M14 22h20" />
  </svg>
)

const categories: Category[] = [
  { name: "茶器", en: "TEA", icon: <TeaIcon /> },
  { name: "花器", en: "VASE", icon: <VaseIcon /> },
  { name: "香炉", en: "INCENSE", icon: <IncenseIcon /> },
  { name: "艺术品", en: "ART", icon: <ArtIcon /> },
]

export function Categories() {
  return (
    <section className="px-4 pt-8">
      {/* 章节标题 */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h3 className="font-serif text-base tracking-[0.3em] text-foreground">器 · 分类</h3>
          <p className="mt-1 font-serif text-[10px] tracking-[0.35em] text-muted-foreground">CATEGORIES</p>
        </div>
        <span className="font-serif text-[10px] tracking-widest text-muted-foreground">肆 类 · 见 匠 心</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {categories.map((c) => (
          <button
            key={c.name}
            className="group flex flex-col items-center gap-2"
            aria-label={c.name}
          >
            {/* 中式圆形结构：双环 */}
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-foreground/10" />
              <div className="absolute inset-1.5 rounded-full bg-primary/25" />
              <div className="relative flex h-full w-full items-center justify-center text-accent">
                {c.icon}
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-serif text-[13px] tracking-[0.2em] text-foreground">{c.name}</span>
              <span className="font-mono text-[8px] tracking-[0.2em] text-muted-foreground">
                {c.en}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
