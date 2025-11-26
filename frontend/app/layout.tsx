import type { Metadata } from "next";
import { fontInter } from "@/config/fonts";
import { Providers } from "@/app/providers";
import "@/style/globals.css";

export const metadata: Metadata = {
  title: 'Invoice Manager',
  description: 'Professional invoice management application',
};

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontInter.className} antialiased`}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
