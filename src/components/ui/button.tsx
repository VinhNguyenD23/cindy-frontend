import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-14 items-center justify-center gap-2 rounded-[18px] border border-transparent px-5 text-sm font-semibold tracking-[0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#8f0f1c]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#e3cbc1]",
        outline: "border-border bg-white text-foreground hover:bg-[#fff1eb]",
        ghost: "text-foreground hover:bg-[#ead6cf]",
      },
      size: {
        default: "min-w-[148px]",
        sm: "h-11 rounded-[16px] px-4 text-sm",
        lg: "h-16 rounded-[20px] px-6 text-base",
        icon: "size-12 rounded-[16px] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
