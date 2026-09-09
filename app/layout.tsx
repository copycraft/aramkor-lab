import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Áramkör Labor — az elektromosság alapjai',
  description:
    'Interaktív áramkör-szerkesztő 8. osztályos fizikához: feszültség, áramerősség, ellenállás, soros és párhuzamos kapcsolás.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
