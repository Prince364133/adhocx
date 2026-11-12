'use client';

let activeLockCount = 0;
let previousBodyOverflow: string | null = null;

/**
 * Reference-counted body scroll lock so stacked overlays (Drawer + Modal / ConfirmDialog)
 * restore scrolling only after the final overlay closes.
 */
export function acquireScrollLock(): () => void {
  if (typeof document === 'undefined') return () => {};

  if (activeLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeLockCount += 1;

  let released = false;
  return () => {
    if (released || typeof document === 'undefined') return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow ?? '';
      previousBodyOverflow = null;
    }
  };
}

