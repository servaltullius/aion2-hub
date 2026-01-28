import "./globals.css";

export const metadata = {
  title: "AION2 HUB",
  description: "AION2 HUB (Planner + Notices diff + Legion ops)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

