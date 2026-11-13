import * as React from "react";

type ToastActionElement = React.ReactElement;

export interface Toast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  /** Em ms; padrão 5000. `Infinity` só fecha pelo botão ou arrastando */
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

// No celular os avisos ficam no topo, sobre o conteúdo: mais de 3 empilhados
// cobrem boa parte da tela
const LIMITE_TOASTS = 3;

type Action =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "UPDATE_TOAST"; toast: Partial<Toast> & Pick<Toast, "id"> }
  | { type: "DISMISS_TOAST"; toastId?: string };

const toastReducer = (state: ToastState, action: Action): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, LIMITE_TOASTS),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    // Tira da lista: o toast fechado não pode continuar ocupando espaço na pilha.
    // A animação de saída acontece no componente, antes de chamar o dismiss
    case "DISMISS_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

type ToastContextValue = {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => {
    id: string;
    dismiss: () => void;
    update: (props: Partial<Toast>) => void;
  };
  dismiss: (toastId?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });

  // O tempo de exibição é contado no componente (components/ui/toast.tsx),
  // que pausa enquanto o usuário toca ou passa o mouse no aviso
  const toast = React.useCallback(
    ({ duration = 5000, ...props }: Omit<Toast, "id">) => {
      const id = genId();

      const update = (props: Partial<Toast>) =>
        dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });

      const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

      dispatch({
        type: "ADD_TOAST",
        toast: {
          ...props,
          id,
          duration,
        },
      });

      return { id, dismiss, update };
    },
    []
  );

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
  }, []);

  const value = React.useMemo(
    () => ({
      toasts: state.toasts,
      toast,
      dismiss,
    }),
    [state.toasts, toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
