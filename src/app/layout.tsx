import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wix ↔ HubSpot Sync',
  description: 'Reliable bi-directional contact sync between Wix and HubSpot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
