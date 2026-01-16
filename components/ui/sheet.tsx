// src/components/ui/sheet.tsx
"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

// Contexto para controlar o estado aberto/fechado
const SheetContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

function Sheet({ 
  open: controlledOpen, 
  onOpenChange, 
  defaultOpen = false,
  ...props 
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  // Usa controlled ou uncontrolled state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <SheetContext.Provider value={{ open, setOpen: handleOpenChange }}>
      <SheetPrimitive.Root 
        open={open} 
        onOpenChange={handleOpenChange} 
        {...props} 
      />
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal" {...props}>
      {children}
    </SheetPrimitive.Portal>
  )
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  const { open } = React.useContext(SheetContext);

  return (
    <AnimatePresence>
      {open && (
        <SheetPrimitive.Overlay asChild forceMount {...props}>
          <motion.div
            data-slot="sheet-overlay"
            className={cn("fixed inset-0 z-50 bg-black/50", className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          />
        </SheetPrimitive.Overlay>
      )}
    </AnimatePresence>
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showHandle = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showHandle?: boolean
}) {
  const { open } = React.useContext(SheetContext);

  // Animation variants based on side
  const variants = {
    left: {
      initial: { x: '-100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    top: {
      initial: { y: '-100%' },
      animate: { y: 0 },
      exit: { y: '-100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  }[side];

  return (
    <AnimatePresence>
      {open && (
        <SheetPortal>
          <SheetOverlay />
          <SheetPrimitive.Content asChild forceMount {...props}>
            <motion.div
              data-slot="sheet-content"
              className={cn(
                "bg-background fixed z-50 flex flex-col gap-4 shadow-lg",
                side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
                side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                side === "top" && "inset-x-0 top-0 h-auto max-h-[85vh] border-b overflow-y-auto",
                side === "bottom" && "inset-x-0 bottom-0 h-auto max-h-[85vh] border-t rounded-t-2xl overflow-y-auto",
                className
              )}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ 
                duration: 0.5, 
                ease: [0.4, 0, 0.2, 1] 
              }}
            >
              {(side === "bottom" || showHandle) && (
                <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
              )}

              {children}

              <SheetPrimitive.Close 
                className={cn(
                  "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none",
                  side === "bottom" ? "top-6 right-4" : "top-4 right-4"
                )}
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            </motion.div>
          </SheetPrimitive.Content>
        </SheetPortal>
      )}
    </AnimatePresence>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4 sm:p-6", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4 sm:p-6", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold text-lg", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function VisuallyHidden({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        className
      )}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  VisuallyHidden,
}