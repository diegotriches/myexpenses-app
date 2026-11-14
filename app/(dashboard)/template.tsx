// Remonta a cada navegação entre as páginas do app logado (comportamento de template.tsx
// no Next): cada bloco do topo da página nova sobe e aparece em cascata curta (regra
// .entrada-pagina no globals.css), inclusive quando os dados já estão em cache. Barra
// lateral e topo ficam fora, no layout, e não animam.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="entrada-pagina">{children}</div>;
}
