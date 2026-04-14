'use client'

import * as React from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  attribute?: 'class' | string
  enableSystem?: boolean
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme, attribute: string) {
  const root = document.documentElement
  if (attribute === 'class') {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    return
  }

  root.setAttribute(attribute, theme)
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  attribute = 'class',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)

  React.useEffect(() => {
    const stored = window.localStorage.getItem('theme')
    const initialTheme: Theme = stored === 'light' || stored === 'dark' ? stored : defaultTheme
    setThemeState(initialTheme)
    applyTheme(initialTheme, attribute)
  }, [attribute, defaultTheme])

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      window.localStorage.setItem('theme', nextTheme)
      applyTheme(nextTheme, attribute)
    },
    [attribute],
  )

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
