import { useState } from "react";

export function useImportacaoCSV() {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const importarCSV = async (file: File) => {
    const form = new FormData();
    form.append("file", file);

    setImportando(true);
    try {
      const resp = await fetch("/api/transacoes/importar", {
        method: "POST",
        body: form,
      });

      const data = await resp.json();
      setResultado(data);
      return data;
    } finally {
      setImportando(false);
    }
  };

  const limparResultado = () => setResultado(null);

  return {
    importarCSV,
    importando,
    resultado,
    limparResultado,
  };
}
