import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A compact wine text action that keeps the 44px touch height every other
 * control in the system meets.
 */
export function InlineLink({ className, children, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
