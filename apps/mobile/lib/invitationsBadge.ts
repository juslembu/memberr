let _refresh: (() => void) | null = null

export function registerBadgeRefresh(fn: () => void) {
  _refresh = fn
}

export function triggerBadgeRefresh() {
  _refresh?.()
}
