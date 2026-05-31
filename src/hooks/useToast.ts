import { useCallback, useState } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastState {
  message: string
  tone: ToastTone
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  return { toast, show }
}
