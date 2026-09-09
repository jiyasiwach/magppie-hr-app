import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppShell } from '@/components/shell/AppShell';
import { CurrentUserProvider } from '@/components/shell/CurrentUserProvider';
import { APP_NAME } from '@/lib/constants';
import './globals.css';

/** One sans-serif, three weights. Nothing else is loaded. */
const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'In-house HR app — front end, mock data only.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={sans.variable}>
      <body>
        <CurrentUserProvider>
          <AppShell>{children}</AppShell>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
