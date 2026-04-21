import { Home, LayoutGrid, BookOpen, ShoppingBag, User } from "lucide-react"

const tabs = [
  { label: "首页", icon: Home, active: true },
  { label: "分类", icon: LayoutGrid },
  { label: "雅集", icon: BookOpen },
  { label: "购物袋", icon: ShoppingBag },
  { label: "我", icon: User },
]

export function TabBar() {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-foreground/10 bg-background/85 backdrop-blur-md">
      <ul className="flex items-center justify-around pb-6 pt-2">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <li key={t.label}>
              <button
                className={`flex flex-col items-center gap-1 px-2 ${
                  t.active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={t.active ? 1.8 : 1.3} />
                <span
                  className={`font-serif text-[10px] tracking-[0.3em] ${
                    t.active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
