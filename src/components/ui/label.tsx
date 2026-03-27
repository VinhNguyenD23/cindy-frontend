import * as React from "react";
import { cn } from "@/lib/utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-semibold tracking-[0.01em] text-foreground",
        className,
      )}
      {...props}
    />
  );
}
