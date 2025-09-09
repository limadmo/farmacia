/**
 * Controller de Vendas - Sistema de Farmácia
 * 
 * Gerencia endpoints REST para operações de vendas.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { VendaService } from '@/application/services/VendaService';
import { CriarVendaData, AtualizarVendaData } from '@/domain/entities/Venda';
import { FormaPagamento } from '@/domain/enums/FormaPagamento';
import { StatusPagamento } from '@/domain/enums/StatusPagamento';
import { validarSchema } from '@/shared/middlewares/validarSchema';

export class VendaController {
  private vendaService: VendaService;

  constructor() {
    this.vendaService = new VendaService();
  }

  /**
   * Validação para criação de venda
   */
  static validarCriarVenda() {
    const schema = z.object({
      clienteId: z.string().uuid().optional(),
      clienteNome: z.string().min(2).max(100).optional(),
      clienteDocumento: z.string().min(11).max(20).optional(),
      clienteTipoDocumento: z.enum(['CPF', 'RG', 'CNH', 'PASSAPORTE']).optional(),
      
      // Dados do paciente (dono da receita)
      pacienteNome: z.string().min(2).max(100).optional(),
      pacienteDocumento: z.string().min(11).max(20).optional(),
      pacienteTipoDocumento: z.string().optional(),
      pacienteEndereco: z.string().min(10).max(200).optional(),
      pacienteTelefone: z.string().min(10).max(15).optional(),
      pacienteRg: z.string().min(7).max(15).optional(),
      
      // Cadastro automático
      cadastrarPacienteComoCliente: z.boolean().optional(),
      
      formaPagamento: z.enum([
        FormaPagamento.DINHEIRO,
        FormaPagamento.CARTAO_CREDITO,
        FormaPagamento.CARTAO_DEBITO,
        FormaPagamento.PIX,
        FormaPagamento.BOLETO,
        FormaPagamento.TRANSFERENCIA,
        FormaPagamento.CREDITO_LOJA
      ]),
      numeroReceita: z.string().min(1).max(50).optional(),
      dataReceita: z.string().optional(),
      observacoes: z.string().max(500).optional(),
      // Campos para venda assistida (farmácias menores)
      vendaAssistida: z.boolean().optional(),
      justificativaVendaAssistida: z.string().min(10).max(300).optional(),
      itens: z.array(
        z.object({
          produtoId: z.string().uuid(),
          quantidade: z.number().positive(),
          precoUnitario: z.number().nonnegative().optional(),
          desconto: z.number().min(0).max(100).optional()
        })
      ).min(1, { message: 'A venda deve ter pelo menos um item' })
    })
    .refine((data) => {
      // Se tem número de receita, a data da receita também deve estar presente
      if (data.numeroReceita) {
        return !!data.dataReceita;
      }
      return true;
    }, {
      message: 'A data da receita é obrigatória quando o número da receita é informado'
    });

    return validarSchema(schema);
  }

  /**
   * Validação para atualização de venda
   */
  static validarAtualizarVenda() {
    const schema = z.object({
      statusPagamento: z.enum([
        StatusPagamento.PENDENTE,
        StatusPagamento.PAGO,
        StatusPagamento.CANCELADO
      ]).optional(),
      receitaArquivada: z.boolean().optional(),
      observacoes: z.string().max(500).optional()
    });

    return validarSchema(schema);
  }

  /**
   * Cria uma nova venda
   */
  async criarVenda(req: Request, res: Response) {
    try {
      const usuarioId = req.usuario!.id;
      const data = req.body as CriarVendaData;

      console.log('📦 Dados recebidos para criação de venda:', JSON.stringify(data, null, 2));

      const venda = await this.vendaService.criarVenda(data, usuarioId);
      
      return res.status(201).json({
        success: true,
        data: venda,
        message: 'Venda criada com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro na criação de venda:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
      // Tratamento específico para diferentes tipos de erro
      if (error.message.includes('medicamento controlado') || 
          error.message.includes('receita') ||
          error.message.includes('documento')) {
        return res.status(422).json({ 
          success: false,
          message: 'Erro de validação para medicamento controlado',
          details: error.message 
        });
      }
      
      if (error.message.includes('estoque')) {
        return res.status(409).json({ 
          success: false,
          message: 'Erro de estoque',
          details: error.message 
        });
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'Erro ao criar venda',
        details: error.message 
      });
    }
  }

  /**
   * Atualiza uma venda existente
   */
  async atualizarVenda(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body as AtualizarVendaData;

      const venda = await this.vendaService.atualizarVenda(id, data);
      return res.status(200).json(venda);
    } catch (error: any) {
      return res.status(400).json({ mensagem: error.message });
    }
  }

  /**
   * Busca uma venda por ID
   */
  async buscarVendaPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const venda = await this.vendaService.buscarVendaPorId(id);

      if (!venda) {
        return res.status(404).json({ mensagem: 'Venda não encontrada' });
      }

      return res.status(200).json(venda);
    } catch (error: any) {
      return res.status(400).json({ mensagem: error.message });
    }
  }

  /**
   * Lista vendas com filtros e paginação
   */
  async listarVendas(req: Request, res: Response) {
    try {
      const { 
        page, 
        limit, 
        clienteId, 
        usuarioId, 
        formaPagamento, 
        statusPagamento,
        dataInicio,
        dataFim,
        temMedicamentoControlado
      } = req.query;

      const filtros: Record<string, any> = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        clienteId: clienteId as string,
        usuarioId: usuarioId as string,
        formaPagamento: formaPagamento as FormaPagamento,
        statusPagamento: statusPagamento as StatusPagamento,
        temMedicamentoControlado: temMedicamentoControlado === 'true' ? true : 
                                 temMedicamentoControlado === 'false' ? false : undefined
      };

      // Converter datas se fornecidas
      if (dataInicio) {
        filtros.dataInicio = new Date(dataInicio as string);
      }

      if (dataFim) {
        filtros.dataFim = new Date(dataFim as string);
      }

      const resultado = await this.vendaService.listarVendas(filtros);
      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({ mensagem: error.message });
    }
  }

  /**
   * Cancela uma venda
   */
  async cancelarVenda(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario!.id;

      const venda = await this.vendaService.cancelarVenda(id, usuarioId);
      return res.status(200).json(venda);
    } catch (error: any) {
      return res.status(400).json({ 
        message: error.message,
        mensagem: error.message 
      });
    }
  }

  /**
   * Finaliza o pagamento de uma venda
   */
  async finalizarPagamento(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const venda = await this.vendaService.finalizarPagamento(id);
      return res.status(200).json(venda);
    } catch (error: any) {
      return res.status(400).json({ mensagem: error.message });
    }
  }

  /**
   * Registra arquivamento de receita médica
   */
  async registrarArquivamentoReceita(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { numeroReceita } = req.body;
      const venda = await this.vendaService.registrarArquivamentoReceita(id, numeroReceita);
      return res.status(200).json(venda);
    } catch (error: any) {
      return res.status(400).json({ mensagem: error.message });
    }
  }

  /**
   * Gera relatório de vendas por período
   */
  async gerarRelatorioVendas(req: Request, res: Response) {
    try {
      const query = req.query;
      const filtros: any = {};
      
      // Converter datas se fornecidas
      if (query.dataInicio) {
        filtros.dataInicio = new Date(query.dataInicio as string);
      }

      if (query.dataFim) {
        filtros.dataFim = new Date(query.dataFim as string);
      }

      // Converter booleanos
      if (query.temMedicamentoControlado !== undefined) {
        filtros.temMedicamentoControlado = query.temMedicamentoControlado === 'true';
      }

      // Copiar outros filtros
      if (query.formaPagamento) filtros.formaPagamento = query.formaPagamento;
      if (query.statusPagamento) filtros.statusPagamento = query.statusPagamento;
      if (query.clienteId) filtros.clienteId = query.clienteId;
      if (query.usuarioId) filtros.usuarioId = query.usuarioId;

      const relatorio = await this.vendaService.gerarRelatorioVendas(filtros);
      return res.status(200).json(relatorio);
    } catch (error: any) {
      return res.status(400).json({ mensagem: error.message });
    }
  }

  /**
   * Verifica permissões para venda assistida de controlados
   */
  async verificarPermissaoVendaAssistida(req: Request, res: Response) {
    try {
      // Importar aqui para evitar dependência circular
      const { podeVendaAssistida, temPermissaoVenda } = await import('@/constants/permissions');
      
      // @ts-ignore - req.usuario existe devido ao middleware auth
      const tipoUsuario = req.usuario?.tipo;
      
      if (!tipoUsuario) {
        return res.status(401).json({ mensagem: 'Usuário não autenticado' });
      }

      const permissoes = {
        podeVenderControlados: temPermissaoVenda(tipoUsuario, 'comReceita'),
        podeVendaAssistida: podeVendaAssistida(tipoUsuario),
        nivelUsuario: tipoUsuario,
        processoSimplificado: true // Indica que é processo simplificado
      };

      return res.status(200).json(permissoes);
    } catch (error: any) {
      return res.status(500).json({ mensagem: error.message });
    }
  }

  /**
   * Schemas de validação para as rotas
   */
}