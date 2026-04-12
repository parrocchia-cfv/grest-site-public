import type { Metadata } from 'next';
import { ThemeRegistry } from '@/components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Modulo iscrizione',
  description: 'Compila il modulo di iscrizione',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
