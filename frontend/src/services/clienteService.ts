/**
 * Serviço de Clientes - Sistema de Farmácia
 * 
 * Gerencia comunicação com API para operações de clientes.
 */

import api from './api';
import {
  Cliente,
  ClienteResponse,
  CriarClienteData,
  AtualizarClienteData,
  MovimentarCreditoData,
  HistoricoCreditoResponse,
  ClienteFilters,
  TipoDocumento,
  TipoMovimentacaoCredito
} from '../types/cliente';

export class ClienteService {
  private baseURL = '/clientes';

  /**
   * Lista todos os clientes ou busca por termo
   */
  async listarClientes(filters?: ClienteFilters): Promise<ClienteResponse[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) {
        params.append('search', filters.search);
      }
      
      const url = params.toString() ? `${this.baseURL}?${params}` : this.baseURL;
      const response = await api.get<ClienteResponse[]>(url);
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao listar clientes');
    }
  }

  /**
   * Busca cliente por ID
   */
  async obterClientePorId(id: string): Promise<ClienteResponse> {
    try {
      const response = await api.get<ClienteResponse>(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar cliente');
    }
  }

  /**
   * Busca cliente por documento
   */
  async buscarClientePorDocumento(documento: string): Promise<ClienteResponse> {
    try {
      const response = await api.get<ClienteResponse>(`${this.baseURL}/documento/${documento}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Cliente não encontrado');
    }
  }

  /**
   * Cria novo cliente
   */
  async criarCliente(data: CriarClienteData): Promise<ClienteResponse> {
    try {
      const response = await api.post<ClienteResponse>(this.baseURL, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao criar cliente');
    }
  }

  /**
   * Atualiza cliente existente
   */
  async atualizarCliente(id: string, data: AtualizarClienteData): Promise<ClienteResponse> {
    try {
      const response = await api.put<ClienteResponse>(`${this.baseURL}/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar cliente');
    }
  }

  /**
   * Remove cliente
   */
  async removerCliente(id: string): Promise<void> {
    try {
      console.log(`ClienteService: Iniciando remoção do cliente ${id}`);
      console.log(`ClienteService: URL da requisição: ${this.baseURL}/${id}`);
      
      // Verifica se o token está presente
      const token = localStorage.getItem('accessToken');
      
      // Verifica headers antes da requisição
      const headers = { Authorization: `Bearer ${token}` };
      console.log('ClienteService: Headers da requisição:', headers);
      
      // Adiciona timeout para garantir que a requisição não fique pendente indefinidamente
      const response = await api.delete(`${this.baseURL}/${id}`, {
        timeout: 10000, // 10 segundos
        headers: headers
      });
      
      console.log(`ClienteService: Resposta recebida com status: ${response.status}`);
      
      // Verifica se a resposta foi bem-sucedida (status 2xx)
      if (response.status < 200 || response.status >= 300) {
        console.error(`ClienteService: Erro de status na resposta: ${response.status}`);
        throw new Error(`Erro ao remover cliente: ${response.status}`);
      }
      
      console.log(`ClienteService: Cliente ${id} removido com sucesso`);
      return;
    } catch (error: any) {
      console.error('ClienteService: Erro ao remover cliente:', error);
      
      // Tratamento de erros mais detalhado
      if (error.response) {
        // O servidor respondeu com um status fora do intervalo 2xx
        console.error(`ClienteService: Erro de resposta: Status ${error.response.status}`, error.response.data);
        throw new Error(error.response.data?.message || `Erro ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error('ClienteService: Sem resposta do servidor', error.request);
        throw new Error('Servidor não respondeu à solicitação. Verifique sua conexão.');
      } else {
        // Erro na configuração da requisição
        console.error('ClienteService: Erro na configuração da requisição', error.message);
        throw new Error(error.message || 'Erro ao remover cliente');
      }
    }
  }

  /**
   * Movimenta crédito do cliente
   */
  async movimentarCredito(dados: MovimentarCreditoData): Promise<ClienteResponse> {
    try {
      const response = await api.post<ClienteResponse>(`${this.baseURL}/${dados.clienteId}/credito`, {
        tipo: dados.tipo,
        valor: dados.valor,
        descricao: dados.descricao
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao movimentar crédito');
    }
  }

  /**
   * Obtém histórico de crédito do cliente
   */
  async obterHistoricoCredito(clienteId: string): Promise<HistoricoCreditoResponse[]> {
    try {
      const response = await api.get<HistoricoCreditoResponse[]>(`${this.baseURL}/${clienteId}/historico-credito`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar histórico de crédito');
    }
  }

  /**
   * Obtém tipos de documento disponíveis
   */
  async obterTiposDocumento(): Promise<{ value: string; label: string }[]> {
    try {
      const response = await api.get<{ value: string; label: string }[]>(`${this.baseURL}/tipos-documento`);
      return response.data;
    } catch (error: any) {
      // Fallback para tipos estáticos se a API falhar
      return [
        { value: TipoDocumento.CPF, label: 'CPF' },
        { value: TipoDocumento.CNPJ, label: 'CNPJ' },
        { value: TipoDocumento.PASSAPORTE, label: 'Passaporte' }
      ];
    }
  }

  /**
   * Obtém tipos de movimentação de crédito disponíveis
   */
  async obterTiposMovimentacao(): Promise<{ value: string; label: string }[]> {
    try {
      const response = await api.get<{ value: string; label: string }[]>(`${this.baseURL}/tipos-movimentacao`);
      return response.data;
    } catch (error: any) {
      // Fallback para tipos estáticos se a API falhar
      return [
        { value: TipoMovimentacaoCredito.CREDITO, label: 'Crédito' },
        { value: TipoMovimentacaoCredito.DEBITO, label: 'Débito' },
        { value: TipoMovimentacaoCredito.PAGAMENTO, label: 'Pagamento' }
      ];
    }
  }

  /**
   * Valida documento (CPF/CNPJ)
   */
  validarDocumento(documento: string, tipo: TipoDocumento): boolean {
    if (!documento) return false;
    
    const apenasNumeros = documento.replace(/\D/g, '');
    
    if (tipo === TipoDocumento.CPF) {
      return this.validarCPF(apenasNumeros);
    } else if (tipo === TipoDocumento.CNPJ) {
      return this.validarCNPJ(apenasNumeros);
    }
    
    return true; // Para passaporte, aceita qualquer formato
  }

  /**
   * Valida CPF
   */
  validarCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; // Todos os dígitos iguais
    
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }

  /**
   * Valida CNPJ
   */
  validarCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false; // Todos os dígitos iguais
    
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    
    return true;
  }

  /**
   * Formata documento para exibição
   */
  formatarDocumento(documento: string, tipo: TipoDocumento): string {
    if (!documento) return '';
    
    const apenasNumeros = documento.replace(/\D/g, '');
    
    if (tipo === TipoDocumento.CPF && apenasNumeros.length === 11) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (tipo === TipoDocumento.CNPJ && apenasNumeros.length === 14) {
      return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return documento; // Para passaporte ou formato inválido
  }
}

// Instância singleton do serviço
export const clienteService = new ClienteService();
export default clienteService;