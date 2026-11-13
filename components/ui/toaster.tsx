"use client";

import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";

// Celular: no topo, o mais novo em cima, respeitando o recorte da tela (notch).
// A partir de 640 px: canto inferior direito
export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:bottom-0 sm:right-0 sm:top-auto sm:pt-4 md:max-w-[420px] pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
