import { LoaderCircle } from "lucide-react"
import { cn } from "cn"

interface SpinnerProps {
  className?: string
  variant?: "border" | "icon"
}

function Spinner({ className, variant = "border" }: SpinnerProps) {
  if (variant === "icon") {
    return (
      <LoaderCircle
        role="status"
        aria-label="Loading"
        className={cn("size-4 animate-spin", className)}
      />
    )
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "size-4 animate-spin rounded-full border-5 border-white/20 border-t-brand-yellow",
        className,
      )}
    />
  )
}

export { Spinner }