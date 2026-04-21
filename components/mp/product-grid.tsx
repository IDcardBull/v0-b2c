import Image from "next/image"

type Product = {
  id: string
  name: string
  subtitle: string
  price: number
  image: string
  ratio: "square" | "tall" | "portrait"
  tag?: string
}

const products: Product[] = [
  {
    id: "1",
    name: "青釉侧把壶",
    subtitle: "龙泉窑 · 柴烧",
    price: 2680,
    image: "/product-teapot.jpg",
    ratio: "square",
    tag: "孤品",
  },
  {
    id: "2",
    name: "素白长颈瓶",
    subtitle: "景德镇 · 手作",
    price: 1880,
    image: "/product-vase2.jpg",
    ratio: "tall",
  },
  {
    id: "3",
    name: "月映茶盏 · 一对",
    subtitle: "粉青釉 · 开片",
    price: 960,
    image: "/product-cup.jpg",
    ratio: "square",
  },
  {
    id: "4",
    name: "墨韵三足炉",
    subtitle: "炭灰釉 · 铁胎",
    price: 3200,
    image: "/product-incense.jpg",
    ratio: "portrait",
    tag: "典藏",
  },
  {
    id: "5",
    name: "建盏茶碗",
    subtitle: "曜变 · 束口",
    price: 1480,
    image: "/product-bowl.jpg",
    ratio: "square",
  },
  {
    id: "6",
    name: "素器 · 无题",
    subtitle: "当代艺术 · 王一凡",
    price: 8800,
    image: "/product-art.jpg",
    ratio: "tall",
    tag: "签名",
  },
  {
    id: "7",
    name: "青白釉梅瓶",
    subtitle: "仿宋 · 手拉坯",
    price: 2280,
    image: "/product-vase.jpg",
    ratio: "portrait",
  },
]

const ratioClass: Record<Product["ratio"], string> = {
  square: "aspect-square",
  tall: "aspect-[3/4]",
  portrait: "aspect-[4/5]",
}

function ProductCard({ p }: { p: Product }) {
  return (
    <article className="group">
      {/* 纯色米白底，器物居中 */}
      <div className="relative overflow-hidden rounded-sm bg-card">
        <div className={`relative w-full ${ratioClass[p.ratio]}`}>
          <Image
            src={p.image || "/placeholder.svg"}
            alt={p.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            sizes="(max-width: 480px) 50vw, 240px"
          />
        </div>
        {p.tag && (
          <div className="absolute left-2 top-2">
            <span className="inline-flex items-center gap-1 bg-background/70 px-1.5 py-0.5 font-serif text-[9px] tracking-[0.3em] text-accent backdrop-blur-sm">
              <span className="h-px w-2 bg-accent/60" />
              {p.tag}
            </span>
          </div>
        )}
      </div>

      {/* 文字信息 · 专业克制 */}
      <div className="mt-2.5 px-0.5">
        <h4 className="font-serif text-[13px] leading-snug tracking-wider text-foreground text-pretty">
          {p.name}
        </h4>
        <p className="mt-1 font-serif text-[10px] tracking-[0.2em] text-muted-foreground">
          {p.subtitle}
        </p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground">¥</span>
          <span className="font-serif text-[14px] tracking-wide text-foreground">
            {p.price.toLocaleString()}
          </span>
        </div>
      </div>
    </article>
  )
}

export function ProductGrid() {
  // 双列错落：左列与右列分别排列，形成瀑布感
  const left = products.filter((_, i) => i % 2 === 0)
  const right = products.filter((_, i) => i % 2 === 1)

  return (
    <section className="px-4 pb-20 pt-10">
      {/* 章节标题 */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h3 className="font-serif text-base tracking-[0.3em] text-foreground">器 · 新荐</h3>
          <p className="mt-1 font-serif text-[10px] tracking-[0.35em] text-muted-foreground">CURATED</p>
        </div>
        <span className="font-serif text-[10px] tracking-widest text-muted-foreground">近 · 七 件</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        <div className="flex flex-col gap-6">
          {left.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-6">
          {right.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>

      {/* 结束分割：中式印章感 */}
      <div className="mt-12 flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-foreground/20" />
        <span className="font-serif text-[10px] tracking-[0.5em] text-muted-foreground">止 於 此</span>
        <span className="h-px w-10 bg-foreground/20" />
      </div>
    </section>
  )
}
