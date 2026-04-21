import { Signal, Wifi, BatteryFull } from "lucide-react"

export function StatusBar() {
  return (
    <div className="flex h-9 items-center justify-between px-5 text-[13px] font-medium tracking-wide text-foreground">
      <span className="font-mono">9:41</span>
      <div className="flex items-center gap-1">
        <Signal className="h-3.5 w-3.5" strokeWidth={2.2} />
        <Wifi className="h-3.5 w-3.5" strokeWidth={2.2} />
        <BatteryFull className="h-4 w-4" strokeWidth={2} />
      </div>
    </div>
  )
}
