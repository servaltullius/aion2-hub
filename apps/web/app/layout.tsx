import "./globals.css";

import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "AION2 HUB",
  description: "AION2 HUB (Planner + Notices diff + Legion ops)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
