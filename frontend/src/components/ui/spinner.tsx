import { cn } from "cn"

function Spinner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "size-4 animate-spin rounded-full border-5 border-white/20 border-t-brand-yellow",
        className,
      )}
      {...props}
    />
  )
}

export { Spinner }