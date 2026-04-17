import * as React from 'react'

const MOBILE_BREAKPOINT = 768

function getIsMobileSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    }, []),
    getIsMobileSnapshot,
    () => false,
  )
}
