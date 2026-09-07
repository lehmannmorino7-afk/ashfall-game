import "./globals.css";

export const metadata = {
  title: "Ashfall Game",
  description: "Ashfall Game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
