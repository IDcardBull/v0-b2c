import { Search, MoreHorizontal, Minus } from "lucide-react"

export function TopBar() {
  return (
    <div className="relative z-20 px-4 pb-2 pt-1">
      <div className="flex items-center gap-3">
        {/* 极简搜索栏：透明玻璃态 */}
        <div className="flex h-9 flex-1 items-center gap-2 rounded-full border border-foreground/15 bg-background/40 px-4 backdrop-blur-md">
          <Search className="h-3.5 w-3.5 text-foreground/60" strokeWidth={1.5} />
          <span className="font-serif text-[13px] tracking-wider text-foreground/50">搜索 · 青瓷 / 紫砂 / 宋式</span>
        </div>

        {/* 微信小程序胶囊按钮 */}
        <div className="flex h-7 items-center rounded-full border border-foreground/15 bg-background/40 backdrop-blur-md">
          <button aria-label="更多" className="flex h-full w-8 items-center justify-center">
            <MoreHorizontal className="h-4 w-4 text-foreground/70" strokeWidth={1.5} />
          </button>
          <div className="h-3 w-px bg-foreground/15" />
          <button aria-label="关闭" className="flex h-full w-8 items-center justify-center">
            <Minus className="h-3.5 w-3.5 text-foreground/70" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
