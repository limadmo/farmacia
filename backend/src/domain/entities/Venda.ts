import { FormaPagamento } from '../enums/FormaPagamento';
import { StatusPagamento } from '../enums/StatusPagamento';


export interface ItemVenda {
  id: string;
  vendaId: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number | any; // Aceita Decimal do Prisma
  desconto: number | any; // Aceita Decimal do Prisma
  total: number | any; // Aceita Decimal do Prisma
  
  // Relacionamentos
  produto?: any; // Produto completo se incluído
}

export interface Venda {
  id: string;
  clienteId?: string | null; // Cliente opcional para vendas anônimas
  usuarioId: string;
  
  // Dados do cliente para vendas anônimas (quando necessário por receita)
  clienteNome?: string | null;
  clienteDocumento?: string | null;
  clienteTipoDocumento?: string | null;
  
  // Dados do paciente (dono da receita) - pode ser diferente do cliente
  pacienteNome?: string | null;
  pacienteDocumento?: string | null;
  pacienteTipoDocumento?: string | null;
  pacienteEndereco?: string | null;
  
  valorTotal: number | any; // Aceita Decimal do Prisma
  valorDesconto: number | any; // Aceita Decimal do Prisma
  valorFinal: number | any; // Aceita Decimal do Prisma
  
  formaPagamento: FormaPagamento | string;
  statusPagamento: StatusPagamento | string;
  
  // Controle de receitas médicas
  temMedicamentoControlado: boolean;
  receitaArquivada: boolean;
  numeroReceita?: string | null;
  dataReceita?: string | null;
  
  observacoes?: string | null;
  
  criadoEm: Date;
  atualizadoEm: Date;
  
  // Relacionamentos
  cliente?: any; // Cliente completo se incluído
  usuario?: any; // Usuario completo se incluído
  itens?: ItemVenda[];
}

export interface CriarVendaData {
  clienteId?: string;
  
  // Para vendas anônimas com medicamento controlado
  clienteNome?: string;
  clienteDocumento?: string;
  clienteTipoDocumento?: string;
  
  // Dados do paciente (dono da receita)
  pacienteNome?: string;
  pacienteDocumento?: string;
  pacienteTipoDocumento?: string;
  pacienteEndereco?: string;
  pacienteTelefone?: string;
  
  // Cadastro automático de cliente
  cadastrarPacienteComoCliente?: boolean;
  
  formaPagamento: FormaPagamento;
  numeroReceita?: string;
  dataReceita?: string;
  observacoes?: string;
  
  // Para venda assistida de controlados (farmácias menores)
  vendaAssistida?: boolean;
  justificativaVendaAssistida?: string;
  
  itens: Array<{
    produtoId: string;
    quantidade: number;
    precoUnitario?: number; // Se não informado, usa preço do produto
    desconto?: number;
  }>;
}

export interface AtualizarVendaData {
  statusPagamento?: StatusPagamento;
  receitaArquivada?: boolean;
  observacoes?: string;
}

// Para relatórios e consultas
export interface FiltroVenda {
  dataInicio?: Date;
  dataFim?: Date;
  clienteId?: string;
  usuarioId?: string;
  formaPagamento?: FormaPagamento;
  statusPagamento?: StatusPagamento;
  temMedicamentoControlado?: boolean;
}

/**
 * Regras de negócio para vendas farmacêuticas
 */
export class VendaBusinessRules {
  /**
   * Valida dados de criação de venda
   */
  static validateCriarVenda(data: CriarVendaData): string[] {
    const errors: string[] = [];

    // Validar forma de pagamento
    if (!data.formaPagamento) {
      errors.push('Forma de pagamento é obrigatória');
    }

    // Validar itens
    if (!data.itens || data.itens.length === 0) {
      errors.push('Venda deve ter pelo menos um item');
    }

    data.itens?.forEach((item, index) => {
      if (!item.produtoId?.trim()) {
        errors.push(`Item ${index + 1}: Produto é obrigatório`);
      }
      
      if (!item.quantidade || item.quantidade <= 0) {
        errors.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
      }
      
      if (item.precoUnitario !== undefined && item.precoUnitario < 0) {
        errors.push(`Item ${index + 1}: Preço unitário não pode ser negativo`);
      }
      
      if (item.desconto !== undefined && (item.desconto < 0 || item.desconto > 100)) {
        errors.push(`Item ${index + 1}: Desconto deve estar entre 0% e 100%`);
      }
    });

    return errors;
  }

  /**
   * Valida venda com medicamentos controlados
   */
  static validateVendaControlada(data: CriarVendaData, temMedicamentoControlado: boolean): string[] {
    const errors: string[] = [];

    if (temMedicamentoControlado) {
      // Para venda assistida, validar apenas justificativa
      if (data.vendaAssistida) {
        if (!data.justificativaVendaAssistida?.trim()) {
          errors.push('Justificativa é obrigatória para venda assistida de controlados');
        } else if (data.justificativaVendaAssistida.trim().length < 10) {
          errors.push('Justificativa deve ter pelo menos 10 caracteres');
        }
      }

      // Validar número da receita com regras robustas
      if (!data.numeroReceita?.trim()) {
        errors.push('Número da receita é obrigatório para medicamentos controlados');
      } else {
        const receitaValidation = this.validateNumeroReceita(data.numeroReceita);
        if (!receitaValidation.valid) {
          errors.push(...receitaValidation.errors);
        }
      }

      // Validar data da receita
      if (!data.dataReceita) {
        errors.push('Data da receita é obrigatória para medicamentos controlados');
      } else {
        // Tenta converter a string para uma data válida
        const dataReceitaDate = new Date(data.dataReceita);
        
        // Verifica se a data é válida após a conversão
        if (isNaN(dataReceitaDate.getTime())) {
          errors.push('Formato de data da receita inválido. Use o formato AAAA-MM-DD.');
        } else {
          const prazoValidation = this.validatePrazoReceita(dataReceitaDate);
          if (!prazoValidation.valid) {
            errors.push(...prazoValidation.errors);
          }
        }
      }

      // Validar dados do cliente (se não tiver clienteId)
      if (!data.clienteId) {
        if (!data.clienteNome?.trim()) {
          errors.push('Nome do cliente é obrigatório para medicamentos controlados');
        } else if (data.clienteNome.trim().length < 2) {
          errors.push('Nome do cliente deve ter pelo menos 2 caracteres');
        }
        
        if (!data.clienteDocumento?.trim()) {
          errors.push('Documento do cliente é obrigatório para medicamentos controlados');
        }
        
        if (!data.clienteTipoDocumento?.trim()) {
          errors.push('Tipo de documento é obrigatório para medicamentos controlados');
        }
        
        // Validar formato do documento
        if (data.clienteDocumento && data.clienteTipoDocumento) {
          const documentoValido = this.validateDocumento(data.clienteDocumento, data.clienteTipoDocumento);
          if (!documentoValido) {
            errors.push('Documento do cliente inválido');
          }
        }
        
        // Validar tipos de documento aceitos
        if (data.clienteTipoDocumento && !['CPF', 'RG', 'CNH', 'PASSAPORTE'].includes(data.clienteTipoDocumento)) {
          errors.push('Tipo de documento deve ser CPF, RG, CNH ou PASSAPORTE');
        }
      }
      
      // Validar dados do paciente (obrigatórios para medicamentos controlados)
      if (!data.pacienteNome?.trim()) {
        errors.push('Nome do paciente é obrigatório para medicamentos controlados');
      } else if (data.pacienteNome.trim().length < 2) {
        errors.push('Nome do paciente deve ter pelo menos 2 caracteres');
      }
      
      if (!data.pacienteDocumento?.trim()) {
        errors.push('Documento do paciente é obrigatório para medicamentos controlados');
      }
      
      if (!data.pacienteTipoDocumento?.trim()) {
        errors.push('Tipo de documento do paciente é obrigatório para medicamentos controlados');
      }
      
      if (!data.pacienteEndereco?.trim()) {
        errors.push('Endereço do paciente é obrigatório para medicamentos controlados');
      } else if (data.pacienteEndereco.trim().length < 10) {
        errors.push('Endereço do paciente deve ter pelo menos 10 caracteres');
      }
      
      // Validar formato do documento do paciente
      if (data.pacienteDocumento && data.pacienteTipoDocumento) {
        const documentoValido = this.validateDocumento(data.pacienteDocumento, data.pacienteTipoDocumento);
        if (!documentoValido) {
          errors.push('Documento do paciente inválido');
        }
      }
      
      // Validar tipos de documento aceitos para paciente
      if (data.pacienteTipoDocumento && !['CPF', 'RG', 'CNH', 'PASSAPORTE'].includes(data.pacienteTipoDocumento)) {
        errors.push('Tipo de documento do paciente deve ser CPF, RG, CNH ou PASSAPORTE');
      }
    }

    return errors;
  }

  /**
   * Valida formato de documento
   */
  static validateDocumento(documento: string, tipo: string): boolean {
    const cleanDoc = documento.replace(/\D/g, '');
    
    switch (tipo.toUpperCase()) {
      case 'CPF':
        return this.validateCPF(cleanDoc);
      case 'RG':
        return cleanDoc.length >= 7 && cleanDoc.length <= 9;
      case 'CNH':
        return cleanDoc.length === 11;
      default:
        return cleanDoc.length >= 7; // Validação genérica
    }
  }

  /**
   * Valida CPF
   */
  private static validateCPF(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
  }

  /**
   * Calcula valores da venda com precisão otimizada
   */
  static calcularValores(itens: Array<{
    quantidade: number;
    precoUnitario: number;
    desconto?: number;
  }>): {
    valorTotal: number;
    valorDesconto: number;
    valorFinal: number;
    itensCalculados: Array<{
      quantidade: number;
      precoUnitario: number;
      desconto: number;
      subtotal: number;
      valorDesconto: number;
      total: number;
    }>;
  } {
    if (!itens || itens.length === 0) {
      return {
        valorTotal: 0,
        valorDesconto: 0,
        valorFinal: 0,
        itensCalculados: []
      };
    }

    let valorTotalGeral = 0;
    let valorDescontoGeral = 0;
    const itensCalculados: Array<{
      quantidade: number;
      precoUnitario: number;
      desconto: number;
      subtotal: number;
      valorDesconto: number;
      total: number;
    }> = [];

    itens.forEach(item => {
      // Validações básicas
      if (item.quantidade <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }
      
      if (item.precoUnitario < 0) {
        throw new Error('Preço unitário não pode ser negativo');
      }
      
      const desconto = item.desconto || 0;
      if (desconto < 0 || desconto > 100) {
        throw new Error('Desconto deve estar entre 0% e 100%');
      }

      // Cálculos com precisão
      const subtotal = Math.round((item.quantidade * item.precoUnitario) * 100) / 100;
      const valorDescontoItem = Math.round((subtotal * desconto / 100) * 100) / 100;
      const totalItem = Math.round((subtotal - valorDescontoItem) * 100) / 100;
      
      // Validar que o total não seja negativo
      if (totalItem < 0) {
        throw new Error('Total do item não pode ser negativo após desconto');
      }
      
      valorTotalGeral += subtotal;
      valorDescontoGeral += valorDescontoItem;
      
      itensCalculados.push({
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        desconto: desconto,
        subtotal: subtotal,
        valorDesconto: valorDescontoItem,
        total: totalItem
      });
    });

    // Arredondar valores finais
    const valorTotal = Math.round(valorTotalGeral * 100) / 100;
    const valorDesconto = Math.round(valorDescontoGeral * 100) / 100;
    const valorFinal = Math.round((valorTotal - valorDesconto) * 100) / 100;

    // Validação final
    if (valorFinal < 0) {
      throw new Error('Valor final da venda não pode ser negativo');
    }

    return {
      valorTotal,
      valorDesconto,
      valorFinal,
      itensCalculados
    };
  }

  /**
   * Verifica se venda pode ser cancelada
   */
  static podeCancelar(statusPagamento: StatusPagamento | string): boolean {
    return statusPagamento === StatusPagamento.PENDENTE;
  }

  /**
   * Verifica se venda pode ter pagamento finalizado
   */
  static podeFinalizarPagamento(statusPagamento: StatusPagamento | string): boolean {
    return statusPagamento === StatusPagamento.PENDENTE;
  }

  /**
   * Verifica se venda pode ser extornada
   */
  static podeExtornar(statusPagamento: StatusPagamento | string): boolean {
    return statusPagamento === StatusPagamento.PAGO;
  }

  /**
   * Verifica se receita pode ser arquivada
   */
  static podeArquivarReceita(venda: { temMedicamentoControlado: boolean; receitaArquivada: boolean }): boolean {
    return venda.temMedicamentoControlado && !venda.receitaArquivada;
  }

  /**
   * Valida número da receita médica com regras mais robustas
   */
  static validateNumeroReceita(numeroReceita: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!numeroReceita?.trim()) {
      errors.push('Número da receita é obrigatório');
      return { valid: false, errors };
    }
    
    const receita = numeroReceita.trim();
    
    // Validar comprimento
    if (receita.length < 3) {
      errors.push('Número da receita deve ter pelo menos 3 caracteres');
    }
    
    if (receita.length > 50) {
      errors.push('Número da receita deve ter no máximo 50 caracteres');
    }
    
    // Validar formato: letras, números, hífens e barras
    const formatoValido = /^[A-Za-z0-9\-/]{3,50}$/.test(receita);
    if (!formatoValido) {
      errors.push('Número da receita deve conter apenas letras, números, hífens e barras');
    }
    
    // Validar que não seja apenas números (muito simples)
    if (/^\d+$/.test(receita) && receita.length < 6) {
      errors.push('Número da receita muito simples. Use um formato mais específico');
    }
    
    // Validar que tenha pelo menos um caractere alfanumérico
    if (!/[A-Za-z0-9]/.test(receita)) {
      errors.push('Número da receita deve conter pelo menos um caractere alfanumérico');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Valida se a receita está dentro do prazo de validade
   */
  static validatePrazoReceita(dataReceita?: Date, diasValidade: number = 30): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!dataReceita) {
      // Se não informada, considera válida (pode ser validada manualmente)
      return { valid: true, errors };
    }
    
    const hoje = new Date();
    const diffTime = hoje.getTime() - dataReceita.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > diasValidade) {
      errors.push(`Receita vencida. Prazo de validade: ${diasValidade} dias`);
    }
    
    if (dataReceita > hoje) {
      errors.push('Data da receita não pode ser futura');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Gera número sequencial de venda
   */
  static gerarNumeroVenda(ultimoNumero?: string): string {
    const ano = new Date().getFullYear();
    const ultimoNum = ultimoNumero ? parseInt(ultimoNumero.split('-')[1]) || 0 : 0;
    const novoNum = (ultimoNum + 1).toString().padStart(6, '0');
    return `VEN-${ano}-${novoNum}`;
  }
}
