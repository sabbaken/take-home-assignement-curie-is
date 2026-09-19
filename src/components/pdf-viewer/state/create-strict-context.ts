import { createContext, use } from 'react'

export function createStrictContext<T>(name: string) {
  const Context = createContext<T | null>(null)

  function useStrictContext() {
    const value = use(Context)

    if (value === null) {
      throw new Error(`${name} is only available inside <PdfViewerProvider>`)
    }

    return value
  }

  return [Context, useStrictContext] as const
}
