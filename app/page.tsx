import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE } from '@/lib/i18n/dictionary'

/** Indonesian is the default (PRD §9). */
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`)
}
