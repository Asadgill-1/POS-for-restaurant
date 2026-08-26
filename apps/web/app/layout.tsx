import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Mizan POS', template: '%s · Mizan POS' },
  description: 'Restaurant point of sale for the UAE.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // POS terminals are touch devices; accidental pinch-zoom mid-service is a
  // usability bug, but zoom stays available for accessibility (spec §80).
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `lang` and `dir` become dynamic in M2 when next-intl lands (spec §81).
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
