import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Texas-Florida Golf Majors Showdown',
  description: 'Track live PGA Tour events, leaderboards, player headshots, and 18-hole scorecards in real-time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-white`}>

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
