import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'Brown Movies | Premium Movie Store',
  description: 'Nunua na Download Movies, Series, na Katuni - M-Pesa, Airtel Money, HaloPesa. Movies za Action, Bollywood, Korean, Chinese na zaidi!',
  keywords: ['movies', 'series', 'download', 'tanzania', 'swahili', 'katuni', 'bollywood', 'korean drama', 'chinese drama'],
  other: {
    google: 'notranslate',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1410',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sw" translate="no" className="notranslate" suppressHydrationWarning>
      <body translate="no" className={`${inter.variable} notranslate font-sans antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            <TooltipProvider>
              {children}
              <Toaster position="top-center" richColors closeButton />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
