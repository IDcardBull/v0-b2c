export function BrandHeader() {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <div className="flex items-baseline gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/70">
          <span className="font-serif text-[11px] leading-none text-accent">釉</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <h1 className="font-serif text-[15px] tracking-[0.3em] text-foreground">釉见陶瓷</h1>
          <span className="font-serif text-[9px] tracking-[0.25em] text-muted-foreground">YOU · JIAN</span>
        </div>
      </div>
      <span className="font-serif text-[10px] tracking-[0.3em] text-muted-foreground">器以载道</span>
    </div>
  )
}
