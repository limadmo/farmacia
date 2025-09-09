import api from './api';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  representanteNome?: string;
  representanteTelefone?: string;
  representanteEmail?: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

interface CreateFornecedorData {
  nome: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  representanteNome?: string;
  representanteTelefone?: string;
  representanteEmail?: string;
  ativo?: boolean;
}

interface FornecedorResponse {
  fornecedores: Fornecedor[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class FornecedorService {
  async listarFornecedores(page: number = 1, search?: string): Promise<FornecedorResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '10');
    if (search) {
      params.append('search', search);
    }

    const response = await api.get<FornecedorResponse>(`/fornecedores?${params}`);
    return response.data;
  }

  async criarFornecedor(data: CreateFornecedorData): Promise<Fornecedor> {
    const response = await api.post<{ data: Fornecedor }>('/fornecedores', data);
    return response.data.data;
  }

  async atualizarFornecedor(id: string, data: Partial<CreateFornecedorData>): Promise<Fornecedor> {
    const response = await api.put<{ data: Fornecedor }>(`/fornecedores/${id}`, data);
    return response.data.data;
  }

  async removerFornecedor(id: string): Promise<void> {
    await api.delete(`/fornecedores/${id}`);
  }
}

export const fornecedorService = new FornecedorService();
export type { Fornecedor, CreateFornecedorData, FornecedorResponse };