import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import React from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
        secondary: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
        destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        outline:
          "text-gray-900 border border-gray-400 bg-transparent dark:text-gray-200 dark:border-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
