import "./styles.css";

export const metadata = {
  title: "Homeschool Study V0.1",
  description: "Voice study proof of concept"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
