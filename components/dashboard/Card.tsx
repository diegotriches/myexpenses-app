type CardProps = {
  titulo: string;
  children: React.ReactNode;
};

export function Card({ titulo, children }: CardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-md space-y-2">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <div>{children}</div>
    </div>
  );
}