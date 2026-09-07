import "./globals.css";

export const metadata = {
  title: "Ashfall",
  description: "Ashfall – Version 0.1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}