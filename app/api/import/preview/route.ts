// src/app/api/import/preview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/db";
import { categorias, contas, cartoes, transacoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validarArquivoImport } from "@/lib/validators/import";
import type { ExportFile, ModuloExport } from "@/types/export";
import type { ImportPreview } from "@/types/import";

/**
 * POST /api/import/preview
 * Gera preview RÁPIDO da importação (sem validação completa)
 * Apenas detecta conflitos básicos
 * 
 * Body:
 * {
 *   dados: ExportFile
 * }
 */
export async function POST(req: NextRequest) {
  const inicio = Date.now();
  
  try {
    // 1. Autenticação
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado", timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json();
    const { dados } = body;

    if (!dados) {
      return NextResponse.json(
        { 
          error: "Campo 'dados' é obrigatório",
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log("[Import Preview] Gerando preview rápido para userId:", userId);

    // 3. Buscar apenas nomes para comparação rápida
    const [
      categoriasExistentes,
      contasExistentes,
      cartoesExistentes
    ] = await Promise.all([
      db.select({ id: categorias.id, nome: categorias.nome })
        .from(categorias)
        .where(eq(categorias.userId, userId)),
      db.select({ id: contas.id, nome: contas.nome })
        .from(contas)
        .where(eq(contas.userId, userId)),
      db.select({ id: cartoes.id, nome: cartoes.nome })
        .from(cartoes)
        .where(eq(cartoes.userId, userId))
    ]);

    // 4. Gerar preview simples (sem validação completa)
    const exportData = dados as ExportFile;
    const preview: ImportPreview = {
      valido: true, // Assume válido para preview rápido
      modulos: Object.keys(exportData.data) as ModuloExport[],
      detalhes: {} as any,
      resumo: {
        totalRegistros: 0,
        novos: 0,
        duplicados: 0,
        conflitos: 0,
        invalidos: 0
      },
      erros: [],
      estrategiaPadrao: "skip",
      tempoEstimado: 0
    };

    // 5. Analisar cada módulo
    const modulos = Object.keys(exportData.data) as ModuloExport[];
    
    for (const modulo of modulos) {
      const registros = exportData.data[modulo] || [];
      const total = Array.isArray(registros) ? registros.length : 0;
      
      let novos = 0;
      let duplicados = 0;
      
      // Detectar duplicatas por nome
      if (modulo === "categorias" && Array.isArray(registros)) {
        const nomesExistentes = new Set(
          categoriasExistentes.map(c => c.nome?.toLowerCase())
        );
        
        registros.forEach((reg: any) => {
          if (nomesExistentes.has(reg.nome?.toLowerCase())) {
            duplicados++;
          } else {
            novos++;
          }
        });
      } else if (modulo === "contas" && Array.isArray(registros)) {
        const nomesExistentes = new Set(
          contasExistentes.map(c => c.nome?.toLowerCase())
        );
        
        registros.forEach((reg: any) => {
          if (nomesExistentes.has(reg.nome?.toLowerCase())) {
            duplicados++;
          } else {
            novos++;
          }
        });
      } else if (modulo === "cartoes" && Array.isArray(registros)) {
        const nomesExistentes = new Set(
          cartoesExistentes.map(c => c.nome?.toLowerCase())
        );
        
        registros.forEach((reg: any) => {
          if (nomesExistentes.has(reg.nome?.toLowerCase())) {
            duplicados++;
          } else {
            novos++;
          }
        });
      } else {
        // Para outros módulos, assume todos como novos
        novos = total;
      }
      
      // Adicionar ao preview
      preview.detalhes[modulo] = {
        modulo,
        total,
        novos,
        duplicados,
        conflitos: duplicados,
        invalidos: 0,
        listaConflitos: [],
        amostraNovos: Array.isArray(registros) ? registros.slice(0, 3) : [],
        amostraDuplicados: []
      };
      
      // Atualizar resumo
      preview.resumo.totalRegistros += total;
      preview.resumo.novos += novos;
      preview.resumo.duplicados += duplicados;
      preview.resumo.conflitos += duplicados;
    }

    // 6. Estimar tempo (aproximadamente 100 registros por segundo)
    preview.tempoEstimado = Math.ceil(preview.resumo.totalRegistros / 100);

    const duracao = Date.now() - inicio;

    console.log("[Import Preview] Preview gerado:", {
      totalRegistros: preview.resumo.totalRegistros,
      novos: preview.resumo.novos,
      duplicados: preview.resumo.duplicados,
      duracao: `${duracao}ms`
    });

    return NextResponse.json(
      {
        preview,
        timestamp: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          "X-Preview-Duration": duracao.toString()
        }
      }
    );
    
  } catch (error: any) {
    const duracao = Date.now() - inicio;
    
    console.error("[Import Preview] Erro ao gerar preview:", {
      error: error.message,
      stack: error.stack,
      duracao: `${duracao}ms`
    });
    
    return NextResponse.json(
      {
        error: "Erro ao gerar preview",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/import/preview
 * CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}