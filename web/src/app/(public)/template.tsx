// La plantilla se vuelve a montar en cada navegación: la página nueva entra
// con un fundido corto en lugar de aparecer de golpe.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
