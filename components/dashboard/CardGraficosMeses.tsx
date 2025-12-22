import { Card } from '@/components/dashboard/Card';
import { DashboardGraficoMeses } from '@/types/dashboard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

type Props = { dados: DashboardGraficoMeses };

export function CardGraficoMeses({ dados }: Props) {
  return (
    <Card titulo="Receita/Despesa/Balanço últimos 6 meses">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={dados}>
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="receitas" fill="#16a34a" />
          <Bar dataKey="despesas" fill="#dc2626" />
          <Bar dataKey="balanco" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
