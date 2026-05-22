"use client"

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type ConfirmTone = "default" | "danger"

type ConfirmOptions = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  useEffect(() => {
    if (!options) return

    function onKeyDown(keyboardInput: KeyboardEvent) {
      if (keyboardInput.key === "Escape") {
        resolverRef.current?.(false)
        resolverRef.current = null
        setOptions(null)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [options])

  async function confirm(nextOptions: ConfirmOptions) {
    setOptions(nextOptions)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }

  function handleClose(value: boolean) {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" onClick={() => handleClose(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">Confirm action</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{options.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{options.description}</p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => handleClose(false)}>
                {options.cancelLabel || "Cancel"}
              </Button>
              <Button variant={options.tone === "danger" ? "danger" : "primary"} onClick={() => handleClose(true)}>
                {options.confirmLabel || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmProvider")
  }
  return context.confirm
}
