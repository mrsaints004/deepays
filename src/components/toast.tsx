"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { X, AlertTriangle } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, variant }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  function handleConfirm(accepted: boolean) {
    confirmState?.resolve(accepted);
    setConfirmState(null);
  }

  const variantStyles: Record<ToastVariant, string> = {
    success: "bg-success text-white",
    error: "bg-danger text-white",
    info: "bg-foreground text-white",
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-message">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => handleConfirm(false)}
            aria-hidden="true"
          />
          <div
            className="relative bg-card border border-border rounded-2xl shadow-lg p-6 max-w-sm w-full mx-4"
            style={{ animation: "confirm-in 0.15s ease-out" }}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="rounded-full bg-warning/10 p-2 shrink-0">
                <AlertTriangle size={18} className="text-warning" />
              </div>
              <p id="confirm-message" className="text-[14px] font-medium text-foreground leading-relaxed pt-1">
                {confirmState.message}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleConfirm(false)}
                className="rounded-xl border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-card-hover active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium shadow-lg ${variantStyles[t.variant]}`}
            style={{
              animation: "toast-in 0.2s ease-out",
            }}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes confirm-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
