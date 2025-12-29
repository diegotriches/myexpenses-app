"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast as ToastType, useToast } from "@/hooks/use-toast";

export function Toast({ toast }: { toast: ToastType }) {
  const { dismiss } = useToast();
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => dismiss(toast.id), 300)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.duration, toast.id, dismiss])

  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
        toast.variant === "destructive"
          ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100"
          : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
      )}
      data-state={isVisible ? "open" : "closed"}
    >
      <div className="grid gap-1 flex-1">
        {toast.title && (
          <div className="text-sm font-semibold">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-sm opacity-90">{toast.description}</div>
        )}
      </div>
      {toast.action}
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => dismiss(toast.id), 300)
        }}
        className={cn(
          "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
          toast.variant === "destructive"
            ? "text-red-600 hover:text-red-700 focus:ring-red-400"
            : "text-gray-500 hover:text-gray-700 focus:ring-gray-400 dark:text-gray-400 dark:hover:text-gray-300"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}