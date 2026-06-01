import { useEffect, useRef } from 'react'

export function usePolling(callback, interval, enabled = true) {
  const callbackRef = useRef(callback)

  // Keep ref current without restarting the interval on every render
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const tick = () => callbackRef.current()
    tick() // call immediately when enabled becomes true
    const id = setInterval(tick, interval)

    return () => clearInterval(id)
  }, [interval, enabled])
}
