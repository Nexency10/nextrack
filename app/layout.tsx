import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexTrack — Sales operations, in focus",
  description: "A clear view of orders, accounts, and sales performance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
