import { useEffect, useState } from "react";
import axios from "axios";
import { DashboardResponse } from "@/types/dashboard";

interface UseDashboardProps {
  mes: number;
  ano: number;
}

export function useDashboard({ mes, ano }: UseDashboardProps) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mes || !ano) return;

    const carregar = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<DashboardResponse>("/api/dashboard", {
          params: { mes, ano },
        });

        setData(res.data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dashboard");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [mes, ano]);

  return { data, loading, error };
}