import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif-display" });

export const metadata = { title: "HCM Lite", description: "AI-assisted human capital management" };

const themeScript = `try{if(localStorage.theme==='dark'||(!localStorage.theme&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 8, fontSize: 13 } }} />
      </body>
    </html>
  );
}
