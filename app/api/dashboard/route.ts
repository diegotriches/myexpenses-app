import { NextRequest, NextResponse } from 'next/server';
import { Transacao } from '@/types/transacao';

export async function GET(req: NextRequest) {
  // Dados simulados
  const transacoes: Transacao[] = [
    {
      id: '1',
      tipo: 'receita',
      valor: 5000,
      descricao: 'Salário',
      data: '2025-12-05',
      categoria: 'Salário',
      conta: 'Conta Corrente',
      formaPagamento: 'aVista',
      condicaoPagamento: 'pix',
    },
    {
      id: '2',
      tipo: 'despesa',
      valor: 1200,
      descricao: 'Aluguel',
      data: '2025-12-02',
      categoria: 'Moradia',
      conta: 'Conta Corrente',
      formaPagamento: 'recorrente',
      condicaoPagamento: 'pix',
      recorrente: true,
    },
    {
      id: '3',
      tipo: 'despesa',
      valor: 300,
      descricao: 'Supermercado',
      data: '2025-12-10',
      categoria: 'Alimentação',
      conta: 'Conta Corrente',
      formaPagamento: 'aVista',
      condicaoPagamento: 'dinheiro',
    },
    {
      id: '4',
      tipo: 'despesa',
      valor: 1500,
      descricao: 'Celular Parcelado',
      data: '2025-12-15',
      categoria: 'Eletrônicos',
      conta: 'Cartão de Crédito',
      formaPagamento: 'parcelado',
      condicaoPagamento: 'cartao',
      parcelado: true,
    },
    {
      id: '5',
      tipo: 'receita',
      valor: 200,
      descricao: 'Venda Online',
      data: '2025-12-12',
      categoria: 'Vendas',
      conta: 'Conta Corrente',
      formaPagamento: 'aVista',
      condicaoPagamento: 'pix',
    },
    // adicione mais transações para teste
  ];

  return NextResponse.json(transacoes);
}
