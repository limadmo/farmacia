import api from './api';
import { 
  Promocao, 
  CreatePromocaoData, 
  UpdatePromocaoData, 
  PromocaoResponse, 
  PromocaoFilters,
  TipoPromocao,
  CondicaoTermino,
  CalculoPromocao,
  ValidacaoPromocao,
  StatusPromocao
} from '../types/promocao';

class PromocaoService {
  /**
   * Lista promoções com filtros e paginação
   */
  async listarPromocoes(params: PromocaoFilters = {}): Promise<PromocaoResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get<PromocaoResponse>(`/promocoes?${queryParams}`);
    return response.data;
  }

  /**
   * Lista promoções vigentes (ativas e dentro do período)
   */
  async listarPromocoesVigentes(): Promise<Promocao[]> {
    const response = await api.get<Promocao[]>('/promocoes/vigentes');
    return response.data;
  }

  /**
   * Busca promoção por ID
   */
  async buscarPromocaoPorId(id: string): Promise<Promocao> {
    const response = await api.get<Promocao>(`/promocoes/${id}`);
    return response.data;
  }

  /**
   * Busca promoções ativas para um produto específico
   */
  async buscarPromocoesPorProduto(produtoId: string): Promise<Promocao[]> {
    const response = await api.get<Promocao[]>(`/promocoes/produto/${produtoId}`);
    return response.data;
  }

  /**
   * Cria nova promoção
   */
  async criarPromocao(data: CreatePromocaoData): Promise<Promocao> {
    const response = await api.post<Promocao>('/promocoes', data);
    return response.data;
  }

  /**
   * Atualiza promoção existente
   */
  async atualizarPromocao(id: string, data: UpdatePromocaoData): Promise<Promocao> {
    const response = await api.put<Promocao>(`/promocoes/${id}`, data);
    return response.data;
  }

  /**
   * Remove promoção (soft delete)
   */
  async removerPromocao(id: string): Promise<void> {
    await api.delete(`/promocoes/${id}`);
  }

  /**
   * Incrementa quantidade vendida da promoção
   */
  async incrementarQuantidadeVendida(id: string, quantidade: number = 1): Promise<void> {
    await api.patch(`/promocoes/${id}/incrementar-vendida`, { quantidade });
  }

  /**
   * Calcula preço promocional e informações de desconto
   */
  calcularPromocao(precoOriginal: number, tipo: TipoPromocao, valorDesconto?: number, porcentagemDesconto?: number): CalculoPromocao {
    let precoPromocional: number;
    let valorDescontoCalculado: number;
    let porcentagemDescontoCalculada: number;

    if (tipo === TipoPromocao.FIXO && valorDesconto !== undefined) {
      valorDescontoCalculado = valorDesconto;
      precoPromocional = Math.max(0, precoOriginal - valorDesconto);
      porcentagemDescontoCalculada = (valorDesconto / precoOriginal) * 100;
    } else if (tipo === TipoPromocao.PORCENTAGEM && porcentagemDesconto !== undefined) {
      porcentagemDescontoCalculada = porcentagemDesconto;
      valorDescontoCalculado = (precoOriginal * porcentagemDesconto) / 100;
      precoPromocional = precoOriginal - valorDescontoCalculado;
    } else {
      throw new Error('Dados insuficientes para calcular promoção');
    }

    const economia = valorDescontoCalculado;

    return {
      precoOriginal,
      precoPromocional: Math.round(precoPromocional * 100) / 100,
      valorDesconto: Math.round(valorDescontoCalculado * 100) / 100,
      porcentagemDesconto: Math.round(porcentagemDescontoCalculada * 100) / 100,
      economia: Math.round(economia * 100) / 100
    };
  }

  /**
   * Valida dados de promoção
   */
  validarPromocao(data: CreatePromocaoData | UpdatePromocaoData): ValidacaoPromocao {
    const erros: string[] = [];

    // Validação de nome
    if ('nome' in data && (!data.nome || data.nome.trim().length < 3)) {
      erros.push('Nome deve ter pelo menos 3 caracteres');
    }

    // Validação de produto
    if ('produtoId' in data && !data.produtoId) {
      erros.push('Produto é obrigatório');
    }

    // Validação de tipo e valores
    if ('tipo' in data && data.tipo) {
      if (data.tipo === TipoPromocao.FIXO) {
        if (!data.valorDesconto || data.valorDesconto <= 0) {
          erros.push('Valor de desconto deve ser maior que zero para promoção fixa');
        }
      } else if (data.tipo === TipoPromocao.PORCENTAGEM) {
        if (!data.porcentagemDesconto || data.porcentagemDesconto <= 0 || data.porcentagemDesconto > 100) {
          erros.push('Porcentagem de desconto deve estar entre 1 e 100');
        }
      }
    }

    // Validação de datas
    if ('dataInicio' in data && 'dataFim' in data && data.dataInicio && data.dataFim) {
      const inicio = new Date(data.dataInicio);
      const fim = new Date(data.dataFim);
      
      if (inicio >= fim) {
        erros.push('Data de início deve ser anterior à data de fim');
      }
      
      if (inicio < new Date()) {
        erros.push('Data de início não pode ser no passado');
      }
    }

    // Validação de quantidade máxima
    if ('condicaoTermino' in data && data.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA) {
      if (!data.quantidadeMaxima || data.quantidadeMaxima <= 0) {
        erros.push('Quantidade máxima deve ser maior que zero para condição de quantidade limitada');
      }
    }

    return {
      valida: erros.length === 0,
      erros
    };
  }

  /**
   * Verifica status atual da promoção
   */
  verificarStatusPromocao(promocao: Promocao): StatusPromocao {
    const agora = new Date();
    const dataInicio = new Date(promocao.dataInicio);
    const dataFim = new Date(promocao.dataFim);
    
    const ativa = promocao.ativo;
    const vigente = agora >= dataInicio && agora <= dataFim;
    
    let disponivel = ativa && vigente;
    let quantidadeRestante: number | undefined;
    
    // Verificar disponibilidade por quantidade
    if (promocao.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA && promocao.quantidadeMaxima) {
      quantidadeRestante = promocao.quantidadeMaxima - promocao.quantidadeVendida;
      disponivel = disponivel && quantidadeRestante > 0;
    }
    
    // Calcular dias restantes
    const diasRestantes = vigente ? Math.ceil((dataFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)) : undefined;
    
    return {
      ativa,
      vigente,
      disponivel,
      quantidadeRestante,
      diasRestantes
    };
  }

  /**
   * Formata valor monetário
   */
  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Formata porcentagem
   */
  formatarPorcentagem(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }
}

export const promocaoService = new PromocaoService();