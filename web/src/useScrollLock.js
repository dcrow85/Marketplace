import { useEffect } from 'react'

// Lock body scroll while an overlay is open — without this, touch scrolls chain to the
// page behind the sheet (rubber-banding, lost grid position on close). Restores the
// previous value so nested overlays unwind correctly.
export function useScrollLock(on = true) {
  useEffect(() => {
    if (!on) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [on])
}
