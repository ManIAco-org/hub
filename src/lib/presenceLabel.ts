/**
 * Singleton for the current "presence label" — what page/project the user is on.
 * Set by page-level components on mount/unmount; read by PresenceTracker hook.
 */
let _label: string | null = null

export function setPresenceLabel(label: string | null): void {
  _label = label
}

export function getPresenceLabel(): string | null {
  return _label
}
