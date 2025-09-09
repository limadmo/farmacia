import api from './api';
import { Produto } from '../types/produto';

interface ProdutoResponse {
  produtos: Produto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class ProdutoService {
  async listarProdutos(pageOrParams: number | {
    page?: number;
    limit?: number;
    search?: string;
    categoriaId?: string;
    classificacaoAnvisa?: string;
    exigeReceita?: string;
    ativo?: string;
    estoqueMinimo?: string;
  } = {}, filters: any = {}): Promise<ProdutoResponse> {
    // Compatibilidade com ambas as assinaturas
    let params: any = {};
    if (typeof pageOrParams === 'number') {
      params = { page: pageOrParams, ...filters };
    } else {
      params = pageOrParams;
    }
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get<ProdutoResponse>(`/produtos?${queryParams}`);
    return response.data;
  }

  async buscarProdutoPorId(id: string): Promise<Produto> {
    const response = await api.get<Produto>(`/produtos/${id}`);
    return response.data;
  }

  async criarProduto(data: any): Promise<Produto> {
    const response = await api.post<{message: string, produto: Produto}>('/produtos', data);
    return response.data.produto;
  }

  async atualizarProduto(id: string, data: any): Promise<Produto> {
    const response = await api.put<{message: string, produto: Produto}>(`/produtos/${id}`, data);
    return response.data.produto;
  }

  async removerProduto(id: string): Promise<void> {
    await api.delete(`/produtos/${id}`);
  }
}

export const produtoService = new ProdutoService();