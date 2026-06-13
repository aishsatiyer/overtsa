import type { ReactNode } from "react";
import { Roboto_Flex } from "next/font/google";
import "./globals.css";
import { ThemeShell } from "./components/layout/theme-shell";

const robotoFlex = Roboto_Flex({
  subsets: ["latin"]
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${robotoFlex.className} antialiased`}>
        <ThemeShell>{children}</ThemeShell>
      </body>
    </html>
  );
}
