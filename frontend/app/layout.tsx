import type { Metadata } from "next";
import { cookies } from "next/headers";
import { fontInter } from "@/config/fonts";
import { Providers } from "@/contexts/HeroProviders";
import { LocaleProvider } from "@/contexts/LocaleProvider";
import { SidebarProvider, SidebarLayout } from "@/components/layout";
import { getLanguageConfig, getLanguages } from "@/lib/i18n/settings.server";
import { fallbackLng } from "@/lib/i18n/settings";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: 'Invoice Manager',
  description: 'Professional invoice management application',
};

export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  const languageConfig = getLanguageConfig();
  const languages = getLanguages();
  
  // Read locale from cookie on server
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const initialLocale = cookieLocale && languages.includes(cookieLocale) ? cookieLocale : fallbackLng;
  
  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body className={`${fontInter.className} antialiased`}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <LocaleProvider languageConfig={languageConfig} initialLocale={initialLocale}>
            <SidebarProvider>
              <SidebarLayout>
                {children}
              </SidebarLayout>
            </SidebarProvider>
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
