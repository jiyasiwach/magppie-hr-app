import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { CurrentUserProvider } from '@/components/shell/CurrentUserProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Magppie HR',
  description: 'In-house HR app — front end, mock data only.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <CurrentUserProvider>
          <AppShell>{children}</AppShell>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
