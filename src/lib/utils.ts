import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes without conflicts.
 * Usage: cn('base-class', conditional && 'extra-class', { 'class': bool })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
