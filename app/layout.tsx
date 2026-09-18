import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SharePlate | Modern Food Donation & Rescue Platform',
  description:
    'Real-time food rescue platform connecting food donors (restaurants, caterers, bakeries) with community shelters and NGOs to eliminate hunger and reduce food waste.',
  keywords: [
    'food donation',
    'food rescue',
    'zero hunger',
    'sustainability',
    'food waste reduction',
    'NGO support',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="font-sans flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
