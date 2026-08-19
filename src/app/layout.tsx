import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acrobat Studio - PDF Editor & eSign',
  description: 'Full-featured PDF editor, eSignature pad, page organizer, and PDF exporter.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
