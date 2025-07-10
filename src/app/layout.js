import "./globals.css"; // <-- ¡ESTA LÍNEA DEBE ESTAR AQUÍ!

export const metadata = {
  title: "Panel de Gestión OSPIF",
  description: "Sistema de gestión de obra social",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
