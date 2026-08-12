import type { Metadata } from 'next'
import { Newsreader, Inter_Tight, Roboto_Mono } from 'next/font/google'
import './globals.css'

/** Self-hosted via next/font (PRD §12) — no runtime request to a font CDN. */
const prose = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-prose',
})

const ui = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
})

const mono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Pasut — analisis harmonik pasang surut',
  description:
    'Mencocokkan komponen pasang surut dari pengamatan tinggi muka laut dengan kuadrat terkecil, melaporkan kondisi penyelesaiannya, dan menolak apa yang tidak didukung rekaman. Alat edukasi, bukan untuk navigasi.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${prose.variable} ${ui.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-chart text-traceInk antialiased">{children}</body>
    </html>
  )
}
