import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Ref } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function composeRefs<T>(...refs: Ref<T>[]) {
  return (node: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref !== null) {
        (ref as React.MutableRefObject<T>).current = node;
      }
    }
  };
}
