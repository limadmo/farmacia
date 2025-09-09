/**
 * Página de Nova Venda - Sistema de Farmácia
 * 
 * Permite criar uma nova venda com múltiplos produtos.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SeletorLotesModal from '../components/SeletorLotesModal';
import vendaService from '../services/vendaService';
import { ItemVenda, LoteSelecionado } from '../types/venda';
import { FormaPagamento } from '../types/venda';
import { requerLoteObrigatorio, obterTipoProdutoLote, obterDescricaoControle } from '../utils/loteUtils';
import toast from 'react-hot-toast';
import api from '../services/api';
import { applySmartDocumentMask, isName } from '../utils/documentMask';
import { formatarTelefone, validarTelefone } from '../utils/documentValidation';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { promocaoService } from '../services/promocaoService';
import { Promocao } from '../types/promocao';

interface Produto {
  id: string;
  nome: string;
  codigoBarras: string;
  preco: number;
  estoque: number;
  controlado: boolean;
  loteObrigatorio: boolean;
  exigeReceita: boolean;
  classeControlada?: string;
  laboratorio?: string;
}

interface ProdutoAPI {
  id: string;
  nome: string;
  codigoBarras: string;
  precoVenda: number;
  estoque: number;
  controlado: boolean;
  loteObrigatorio: boolean;
  exigeReceita: boolean;
  classeControlada?: string;
  laboratorio?: string;
}

interface Cliente {
  id: string;
  nome: string;
  documento: string;
  tipoDocumento: string;
}

const NovaVendaPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados para a venda
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(FormaPagamento.DINHEIRO);
  const [observacoes, setObservacoes] = useState('');
  const [numeroReceita, setNumeroReceita] = useState('');
  const [temMedicamentoControlado, setTemMedicamentoControlado] = useState(false);
  const [dataReceita, setDataReceita] = useState('');
  const [validacaoReceita, setValidacaoReceita] = useState({ valida: true, mensagem: '' });
  
  // Estados para busca de produtos
  const [codigoBarras, setCodigoBarras] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [produtosEncontrados, setProdutosEncontrados] = useState<Produto[]>([]);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [promocaoAplicavel, setPromocaoAplicavel] = useState<Promocao | null>(null);
  const [descontoPromocao, setDescontoPromocao] = useState(0);
  const [precoPromocional, setPrecoPromocional] = useState(0);
  
  // Estados para cliente
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteTipoDocumento, setClienteTipoDocumento] = useState('CPF');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [termoBuscaCliente, setTermoBuscaCliente] = useState('');
  
  // Estados para paciente (dono da receita)
  const [pacienteNome, setPacienteNome] = useState('');
  const [pacienteCpf, setPacienteCpf] = useState('');
  const [pacienteRg, setPacienteRg] = useState('');
  const [pacienteEndereco, setPacienteEndereco] = useState('');
  const [pacienteTelefone, setPacienteTelefone] = useState('');
  const [cadastrarPacienteComoCliente, setCadastrarPacienteComoCliente] = useState(true);
  
  // Estados para cálculos
  const [valorTotal, setValorTotal] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorFinal, setValorFinal] = useState(0);
  
  // Estado de carregamento
  const [loading, setLoading] = useState(false);

  // Estados para seleção de lotes
  const [seletorLotesAberto, setSeletorLotesAberto] = useState(false);
  const [produtoParaLotes, setProdutoParaLotes] = useState<Produto | null>(null);
  const [quantidadeParaLotes, setQuantidadeParaLotes] = useState(0);
  
  // Estados para promoções
  const [promocoesDisponiveis, setPromocoesDisponiveis] = useState<{[produtoId: string]: Promocao[]}>({});
  const [promocoesAplicadas, setPromocoesAplicadas] = useState<{[itemIndex: number]: Promocao}>({});

  // Função para calcular estoque disponível considerando itens já adicionados na venda
  const calcularEstoqueDisponivel = (produtoId: string, estoqueTotal: number): number => {
    const itemExistente = itensVenda.find(item => item.produtoId === produtoId);
    const quantidadeJaAlocada = itemExistente?.quantidade || 0;
    return Math.max(0, estoqueTotal - quantidadeJaAlocada);
  };

  // Função para verificar e aplicar promoções automaticamente
  const verificarPromocoesAplicaveis = async (produto: Produto, loteId?: string): Promise<Promocao | null> => {
    try {
      const promocoes = await promocaoService.buscarPromocoesAplicaveis(produto, loteId);
      
      if (promocoes.length === 0) {
        return null;
      }

      // Aplicar hierarquia: Lote > Produto > Laboratório
      const promocaoLote = promocoes.find(p => p.tipoAlcance === 'LOTE' && p.loteId === loteId);
      if (promocaoLote) {
        return promocaoLote;
      }

      const promocaoProduto = promocoes.find(p => p.tipoAlcance === 'PRODUTO' && p.produtoId === produto.id);
      if (promocaoProduto) {
        return promocaoProduto;
      }

      const promocaoLaboratorio = promocoes.find(p => p.tipoAlcance === 'LABORATORIO' && p.laboratorio === produto.laboratorio);
      if (promocaoLaboratorio) {
        return promocaoLaboratorio;
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar promoções:', error);
      return null;
    }
  };

  // Função para verificar se os critérios da promoção são atendidos
  const verificarCriteriosPromocao = (promocao: Promocao, produto: Produto, loteId?: string): boolean => {
    switch (promocao.tipoAlcance) {
      case 'PRODUTO':
        return promocao.produtoId === produto.id;
      
      case 'LABORATORIO':
        return promocao.laboratorio === produto.laboratorio;
      
      case 'LOTE':
        // Para promoções por lote, só aplicar se loteId for fornecido e corresponder
        return loteId ? promocao.loteId === loteId : false;
      
      default:
        return false;
    }
  };

  // Função para calcular preço com promoção
  const calcularPrecoComPromocao = (precoOriginal: number, promocao: Promocao): { precoFinal: number, desconto: number } => {
    let precoFinal = precoOriginal;
    let desconto = 0;

    if (promocao.tipo === 'FIXO' && promocao.valorDesconto) {
      desconto = promocao.valorDesconto;
      precoFinal = Math.max(0, precoOriginal - desconto);
    } else if (promocao.tipo === 'PORCENTAGEM' && promocao.porcentagemDesconto) {
      desconto = (precoOriginal * promocao.porcentagemDesconto) / 100;
      precoFinal = Math.max(0, precoOriginal - desconto);
    }

    return { precoFinal, desconto };
  };

  // Efeito para calcular valores
  useEffect(() => {
    let total = 0;
    let totalDesconto = 0;
    
    itensVenda.forEach(item => {
      const subtotal = item.precoUnitario! * item.quantidade;
      total += subtotal;
      totalDesconto += item.desconto || 0;
    });
    
    setValorTotal(total);
    setValorDesconto(totalDesconto);
    setValorFinal(total - totalDesconto);
  }, [itensVenda]);

  // Efeito para verificar medicamentos controlados
  useEffect(() => {
    const temControlado = itensVenda.some(item => {
      const produto = item as any;
      return produto.controlado || (produto.produto && produto.produto.controlado);
    });
    
    setTemMedicamentoControlado(temControlado);
    
    // Limpar dados de receita se não há medicamentos controlados
    if (!temControlado) {
      setNumeroReceita('');
      setDataReceita('');
      setValidacaoReceita({ valida: true, mensagem: '' });
    }
  }, [itensVenda]);

  // Validar receita médica
  const validarReceita = (numero: string, data: string) => {
    if (!numero || !data) {
      setValidacaoReceita({ valida: false, mensagem: 'Número e data da receita são obrigatórios' });
      return;
    }

    // Validar formato do número da receita
    if (numero.length < 8) {
      setValidacaoReceita({ valida: false, mensagem: 'Número da receita deve ter pelo menos 8 caracteres' });
      return;
    }

    // Validar data da receita
    const dataReceita = new Date(data);
    const hoje = new Date();
    const diasValidade = 30; // 30 dias de validade
    const dataLimite = new Date(dataReceita.getTime() + (diasValidade * 24 * 60 * 60 * 1000));

    if (dataReceita > hoje) {
      setValidacaoReceita({ valida: false, mensagem: 'Data da receita não pode ser futura' });
      return;
    }

    if (hoje > dataLimite) {
      setValidacaoReceita({ valida: false, mensagem: 'Receita vencida. Validade de 30 dias' });
      return;
    }

    setValidacaoReceita({ valida: true, mensagem: 'Receita válida' });
  };

  // Efeito para validar receita quando dados mudam
  useEffect(() => {
    if (temMedicamentoControlado && (numeroReceita || dataReceita)) {
      validarReceita(numeroReceita, dataReceita);
    }
  }, [numeroReceita, dataReceita, temMedicamentoControlado]);

  // Verificar promoções automaticamente quando produto ou quantidade mudarem
  useEffect(() => {
    const verificarPromocoes = async () => {
      if (!produtoSelecionado) {
        setPromocaoAplicavel(null);
        setDescontoPromocao(0);
        setPrecoPromocional(0);
        return;
      }

      try {
        const promocao = await verificarPromocoesAplicaveis(produtoSelecionado);
        
        if (promocao) {
          // Verificar se os critérios da promoção são atendidos AGORA
          const criteriosAtendidos = verificarCriteriosPromocao(promocao, produtoSelecionado);
          
          if (criteriosAtendidos) {
            // Aplicar promoção imediatamente (PRODUTO ou LABORATORIO)
            const calculo = calcularPrecoComPromocao(produtoSelecionado.preco, promocao);
            setPromocaoAplicavel(promocao);
            setDescontoPromocao(calculo.desconto);
            setPrecoPromocional(calculo.precoFinal);
          } else {
            // Critérios não atendidos (promoção por LOTE) - campos ficam em branco
            setPromocaoAplicavel(null);
            setDescontoPromocao(0);
            setPrecoPromocional(0);
          }
        } else {
          setPromocaoAplicavel(null);
          setDescontoPromocao(0);
          setPrecoPromocional(0);
        }
      } catch (error) {
        console.error('Erro ao verificar promoções:', error);
        setPromocaoAplicavel(null);
        setDescontoPromocao(0);
        setPrecoPromocional(0);
      }
    };

    verificarPromocoes();
  }, [produtoSelecionado, quantidade]);

  // Buscar produto por termo (código de barras, nome ou princípio ativo) - MANTIDO PARA COMPATIBILIDADE
  const buscarProduto = async () => {
    if (!codigoBarras) return;
    
    try {
      const response = await api.get(`/produtos/buscar/${encodeURIComponent(codigoBarras)}`);
      
      if (!response.data) {
        toast.error('Produto não encontrado');
        setProdutoSelecionado(null);
        return;
      }
      
      const produtoData = response.data as ProdutoAPI;
      
      // Mapear precoVenda da API para preco da interface
      // @ts-ignore
      const produto: Produto = {
        id: produtoData.id,
        nome: produtoData.nome,
        codigoBarras: produtoData.codigoBarras,
        preco: produtoData.precoVenda || 0,
        estoque: produtoData.estoque,
        controlado: produtoData.controlado,
        loteObrigatorio: produtoData.loteObrigatorio || false,
        exigeReceita: produtoData.exigeReceita || false,
        classeControlada: produtoData.classeControlada,
        laboratorio: produtoData.laboratorio
      };
      
      setProdutoSelecionado(produto);
      setQuantidade(1);
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      toast.error('Erro ao buscar produto');
      setProdutoSelecionado(null);
    }
  };

  // Buscar produtos por termo - NOVA FUNÇÃO PARA LISTAGEM
  const buscarProdutosPorTermo = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!termoBuscaProduto || termoBuscaProduto.length < 2) {
      setProdutosEncontrados([]);
      return;
    }
    
    await buscarProdutosPorTermoComValor(termoBuscaProduto);
  };

  // Buscar produtos com valor específico
  const buscarProdutosPorTermoComValor = async (valor: string) => {
    if (!valor || valor.length < 2) {
      setProdutosEncontrados([]);
      return;
    }
    
    try {
      setBuscandoProduto(true);
      const response = await api.get(`/produtos?search=${encodeURIComponent(valor)}&limit=50`);
      
      // A resposta pode ser um array direto ou um objeto com propriedade produtos
      let produtos: ProdutoAPI[] = [];
      if (Array.isArray(response.data)) {
        produtos = response.data as ProdutoAPI[];
      } else if (response.data && (response.data as any).produtos) {
        produtos = (response.data as any).produtos as ProdutoAPI[];
      }
      
      // Mapear produtos da API para interface
      const produtosMapeados: Produto[] = produtos.map(produtoData => ({
        id: produtoData.id,
        nome: produtoData.nome,
        codigoBarras: produtoData.codigoBarras,
        preco: produtoData.precoVenda || 0,
        estoque: produtoData.estoque,
        controlado: produtoData.controlado,
        loteObrigatorio: produtoData.loteObrigatorio || false,
        exigeReceita: produtoData.exigeReceita || false,
        classeControlada: produtoData.classeControlada,
        laboratorio: produtoData.laboratorio
      }));
      
      setProdutosEncontrados(produtosMapeados);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutosEncontrados([]);
    } finally {
      setBuscandoProduto(false);
    }
  };



  // Buscar clientes por termo
  const buscarClientesPorTermo = async (e?: React.MouseEvent) => {
    // Prevenir comportamento padrão do evento se existir
    if (e) e.preventDefault();
    
    if (!termoBuscaCliente || termoBuscaCliente.length < 2) {
      setClientesEncontrados([]);
      return;
    }
    
    await buscarClientesPorTermoComValor(termoBuscaCliente);
  };

  // Buscar clientes com valor específico
  const buscarClientesPorTermoComValor = async (valor: string) => {
    if (!valor || valor.length < 2) {
      setClientesEncontrados([]);
      return;
    }
    
    try {
      setBuscandoCliente(true);
      const response = await api.get(`/clientes?search=${encodeURIComponent(valor)}`);
      
      // A resposta pode ser um array direto ou um objeto com propriedade clientes
      let clientes: Cliente[] = [];
      if (Array.isArray(response.data)) {
        clientes = response.data as Cliente[];
      } else if (response.data && (response.data as any).clientes) {
        clientes = (response.data as any).clientes as Cliente[];
      }
      
      setClientesEncontrados(clientes);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClientesEncontrados([]);
    } finally {
      setBuscandoCliente(false);
    }
  };

  // Adicionar item à venda
  const adicionarItem = async () => {
    if (!produtoSelecionado) return;
    
    if (quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    
    if (quantidade > produtoSelecionado.estoque) {
      toast.error(`Estoque insuficiente. Disponível: ${produtoSelecionado.estoque}`);
      return;
    }
    
    // Verificar se produto requer seleção manual de lotes
    if (requerLoteObrigatorio(produtoSelecionado as any)) {
      // Abrir modal de seleção de lotes
      setProdutoParaLotes(produtoSelecionado);
      setQuantidadeParaLotes(quantidade);
      setSeletorLotesAberto(true);
      return;
    }
    
    // Para produtos sem controle de lote, prosseguir normalmente
    if (!localStorage.getItem(`lote_info_${produtoSelecionado.id}`)) {
      toast.success('✅ Lotes serão selecionados automaticamente por vencimento (FEFO)');
      localStorage.setItem(`lote_info_${produtoSelecionado.id}`, 'shown');
    }
    
    // Usar valores promocionais já calculados automaticamente
    const precoFinal = precoPromocional || produtoSelecionado.preco;
    const descontoFinal = descontoPromocao * quantidade;
    
    if (promocaoAplicavel) {
      toast.success(`🎉 Promoção aplicada: ${promocaoAplicavel.nome}`);
    }
    
    // Verificar se o produto já está na lista
    const itemExistente = itensVenda.findIndex(item => item.produtoId === produtoSelecionado.id);
    
    if (itemExistente >= 0) {
      // Atualizar item existente
      const novosItens = [...itensVenda];
      const novaQuantidade = novosItens[itemExistente].quantidade + quantidade;
      
      if (novaQuantidade > produtoSelecionado.estoque) {
        toast.error(`Estoque insuficiente. Disponível: ${produtoSelecionado.estoque}`);
        return;
      }
      
      novosItens[itemExistente].quantidade = novaQuantidade;
      novosItens[itemExistente].desconto = (novosItens[itemExistente].desconto || 0) + descontoFinal;
      
      // Se há promoção, atualizar o preço unitário
      if (promocaoAplicavel) {
        novosItens[itemExistente].precoUnitario = precoFinal;
        setPromocoesAplicadas({...promocoesAplicadas, [itemExistente]: promocaoAplicavel});
      }
      
      setItensVenda(novosItens);
    } else {
      // Adicionar novo item
      const novoItem: ItemVenda = {
        produtoId: produtoSelecionado.id,
        quantidade,
        precoUnitario: precoFinal,
        desconto: descontoFinal,
        produto: produtoSelecionado
      };
      
      const novosItens = [...itensVenda, novoItem];
      setItensVenda(novosItens);
      
      // Se há promoção, registrar
      if (promocaoAplicavel) {
        setPromocoesAplicadas({...promocoesAplicadas, [novosItens.length - 1]: promocaoAplicavel});
      }
    }
    
    // Limpar campos
    setCodigoBarras('');
    setProdutoSelecionado(null);
    setQuantidade(1);
    
    toast.success('Produto adicionado à venda');
  };

  // Remover item da venda
  const removerItem = (index: number) => {
    const novosItens = [...itensVenda];
    novosItens.splice(index, 1);
    setItensVenda(novosItens);
  };

  /**
   * Processar a confirmação de lotes selecionados
   */
  const processarSelecaoLotes = async (lotesSelecionados: LoteSelecionado[]) => {
    if (!produtoParaLotes) return;

    // Verificar se algum lote selecionado tem promoção
    let promocaoAplicada = null;
    let descontoTotal = 0;
    let precoFinal = produtoParaLotes.preco;

    try {
      // Buscar promoções para o produto
      const promocao = await verificarPromocoesAplicaveis(produtoParaLotes);
      
      if (promocao) {
        // Verificar se algum lote selecionado atende aos critérios da promoção
        const lotePromocional = lotesSelecionados.find(lote => 
          verificarCriteriosPromocao(promocao, produtoParaLotes, lote.loteId)
        );
        
        if (lotePromocional) {
          // Aplicar promoção do lote selecionado
          const calculo = calcularPrecoComPromocao(produtoParaLotes.preco, promocao);
          promocaoAplicada = promocao;
          descontoTotal = calculo.desconto * quantidadeParaLotes;
          precoFinal = calculo.precoFinal;
          
          // Atualizar estados da interface para mostrar a promoção aplicada
          setPromocaoAplicavel(promocao);
          setDescontoPromocao(calculo.desconto);
          setPrecoPromocional(calculo.precoFinal);
          
          toast.success(`🎉 Promoção aplicada: ${promocao.nome}`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar promoções para lotes:', error);
    }

    // Criar item com lotes selecionados e promoção (se aplicável)
    const novoItem: ItemVenda = {
      produtoId: produtoParaLotes.id,
      quantidade: quantidadeParaLotes,
      precoUnitario: precoFinal,
      desconto: descontoTotal,
      total: (quantidadeParaLotes * precoFinal),
      produto: produtoParaLotes,
      lotesSelecionados,
      requerSelecaoManual: true
    };

    // Verificar se produto já existe na lista
    const itemExistente = itensVenda.findIndex(item => item.produtoId === produtoParaLotes.id);
    
    if (itemExistente >= 0) {
      // Atualizar item existente (combinar lotes)
      const novosItens = [...itensVenda];
      const itemAtual = novosItens[itemExistente];
      
      // Combinar quantidades
      novosItens[itemExistente] = {
        ...itemAtual,
        quantidade: itemAtual.quantidade + quantidadeParaLotes,
        total: ((itemAtual.quantidade + quantidadeParaLotes) * produtoParaLotes.preco) - (itemAtual.desconto || 0),
        lotesSelecionados: [
          ...(itemAtual.lotesSelecionados || []),
          ...lotesSelecionados
        ]
      };
      
      setItensVenda(novosItens);
    } else {
      // Adicionar novo item
      setItensVenda([...itensVenda, novoItem]);
    }

    // Verificar se tem medicamento controlado
    if (requerLoteObrigatorio(produtoParaLotes as any)) {
      setTemMedicamentoControlado(true);
    }

    toast.success(`${produtoParaLotes.nome} adicionado com lotes selecionados!`);

    // Limpar estados
    setProdutoParaLotes(null);
    setQuantidadeParaLotes(0);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setCodigoBarras('');
  };

  // Selecionar cliente da lista
  const selecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setClienteId(cliente.id);
    setClienteNome(cliente.nome);
    setClienteDocumento(cliente.documento);
    setClienteTipoDocumento(cliente.tipoDocumento);
    setClientesEncontrados([]);
    setTermoBuscaCliente('');
  };

  // Selecionar produto da lista
  const selecionarProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setCodigoBarras(''); // Limpa campo antigo
    setTermoBuscaProduto(''); // Limpa termo de busca
    setProdutosEncontrados([]); // Limpa lista
    setQuantidade(1); // Reset quantidade
    
    // Focar no campo de quantidade após seleção
    setTimeout(() => {
      const quantidadeInput = document.getElementById('quantidade-input');
      if (quantidadeInput) {
        quantidadeInput.focus();
      }
    }, 100);
  };

  // Cancelar seleção do produto atual
  const cancelarSelecao = () => {
    setProdutoSelecionado(null);
    setCodigoBarras('');
    setTermoBuscaProduto('');
    setProdutosEncontrados([]);
    setQuantidade(1);
    setPromocaoAplicavel(null);
    setDescontoPromocao(0);
    setPrecoPromocional(0);
    toast.success('Seleção cancelada');
  };

  /**
   * Calcular variedades de produtos (produtos únicos)
   */
  const calcularVariedadesProdutos = (): number => {
    const produtosUnicos = new Set(itensVenda.map(item => (item.produto as any).id));
    return produtosUnicos.size;
  };

  /**
   * Calcular quantidade total de itens
   */
  const calcularQuantidadeTotal = (): number => {
    return itensVenda.reduce((total, item) => total + (Number(item.quantidade) || 0), 0);
  };

  /**
   * Calcular desconto total aplicado
   */
  const calcularDescontoTotal = (): number => {
    return itensVenda.reduce((total, item) => total + (Number(item.desconto) || 0), 0);
  };

  /**
   * Calcular economia total com promoções
   */
  const calcularEconomiaTotal = (): number => {
    return itensVenda.reduce((total, item, index) => {
      const promocaoAplicada = promocoesAplicadas[index];
      if (promocaoAplicada && promocaoAplicada.economia) {
        return total + Number(promocaoAplicada.economia);
      }
      return total;
    }, 0);
  };

  /**
   * Calcular percentual de economia
   */
  const calcularPercentualEconomia = (valorOriginal: number, desconto: number): number => {
    if (valorOriginal === 0) return 0;
    return (desconto / valorOriginal) * 100;
  };

  /**
   * Calcular percentual total de economia
   */
  const calcularPercentualTotalEconomia = (): number => {
    const total = valorTotal;
    const economia = calcularDescontoTotal() + calcularEconomiaTotal();
    if (total === 0) return 0;
    return (economia / (total + economia)) * 100;
  };

  // Finalizar venda
  const finalizarVenda = async () => {
    if (itensVenda.length === 0) {
      toast.error('Adicione pelo menos um produto à venda');
      return;
    }
    
    // Validar dados de cliente APENAS para medicamentos controlados
    if (temMedicamentoControlado) {
      if (!numeroReceita || !dataReceita) {
        toast.error('Número e data da receita são obrigatórios para medicamentos controlados');
        return;
      }
      
      if (!validacaoReceita.valida) {
        toast.error(`Receita inválida: ${validacaoReceita.mensagem}`);
        return;
      }
      
      if (!clienteId && (!clienteNome || !clienteDocumento)) {
        toast.error('Dados do cliente são obrigatórios para medicamentos controlados');
        return;
      }
      
      // Validar dados do paciente para medicamentos controlados
      if (!pacienteNome || !pacienteCpf || !pacienteRg || !pacienteTelefone) {
        toast.error('Dados do paciente (dono da receita) são obrigatórios para medicamentos controlados');
        return;
      }
      
      // Validar tipo de documento para medicamentos controlados
      if (!clienteId && !['CPF', 'RG', 'CNH', 'PASSAPORTE'].includes(clienteTipoDocumento)) {
        toast.error('Tipo de documento inválido para medicamentos controlados');
        return;
      }
      
      // Validar tamanho mínimo do nome do cliente
      if (!clienteId && clienteNome.length < 3) {
        toast.error('Nome do cliente deve ter pelo menos 3 caracteres');
        return;
      }
      
      // Validar tamanho mínimo do nome do paciente
      if (pacienteNome.length < 3) {
        toast.error('Nome do paciente deve ter pelo menos 3 caracteres');
        return;
      }
      
      // Validar endereço do paciente
      if (!pacienteEndereco || pacienteEndereco.length < 10) {
        toast.error('Endereço do paciente deve ter pelo menos 10 caracteres');
        return;
      }
      
      // Validar telefone do paciente
      if (!validarTelefone(pacienteTelefone)) {
        toast.error('Telefone do paciente deve ter formato válido (10 ou 11 dígitos)');
        return;
      }
    }
    
    // Para vendas sem medicamentos controlados, cliente é opcional
    // Validar apenas se dados foram preenchidos parcialmente
    if (!temMedicamentoControlado && !clienteId) {
      // Se começou a preencher dados do cliente, deve completar
      if ((clienteNome && !clienteDocumento) || (!clienteNome && clienteDocumento)) {
        toast.error('Complete os dados do cliente ou deixe todos os campos em branco');
        return;
      }
      
      // Se preencheu documento, validar tipo
      if (clienteDocumento && !['CPF', 'RG', 'CNH', 'PASSAPORTE'].includes(clienteTipoDocumento)) {
        toast.error('Tipo de documento inválido');
        return;
      }
      
      // Se preencheu nome, validar tamanho mínimo
      if (clienteNome && clienteNome.length < 3) {
        toast.error('Nome do cliente deve ter pelo menos 3 caracteres');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      const dadosVenda: any = {
        formaPagamento,
        itens: itensVenda.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          desconto: item.desconto
        }))
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (clienteId) dadosVenda.clienteId = clienteId;
      if (!clienteId && clienteNome) dadosVenda.clienteNome = clienteNome;
      if (!clienteId && clienteDocumento) dadosVenda.clienteDocumento = clienteDocumento;
      if (!clienteId && clienteTipoDocumento) dadosVenda.clienteTipoDocumento = clienteTipoDocumento;
      
      if (temMedicamentoControlado && pacienteNome) dadosVenda.pacienteNome = pacienteNome;
      if (temMedicamentoControlado && pacienteCpf) dadosVenda.pacienteDocumento = pacienteCpf;
      if (temMedicamentoControlado) dadosVenda.pacienteTipoDocumento = 'CPF';
      if (temMedicamentoControlado && pacienteEndereco) dadosVenda.pacienteEndereco = pacienteEndereco;
      if (temMedicamentoControlado && pacienteRg) dadosVenda.pacienteRg = pacienteRg;
      if (temMedicamentoControlado && pacienteTelefone) dadosVenda.pacienteTelefone = pacienteTelefone;
      if (temMedicamentoControlado) dadosVenda.cadastrarPacienteComoCliente = cadastrarPacienteComoCliente;
      
      if (numeroReceita) dadosVenda.numeroReceita = numeroReceita;
      if (dataReceita) dadosVenda.dataReceita = dataReceita;
      if (observacoes) dadosVenda.observacoes = observacoes;
      
      // Remover campos undefined/null antes de enviar
      const dadosLimpos = Object.fromEntries(
        Object.entries(dadosVenda).filter(([_, value]) => value !== undefined && value !== null)
      );
      
      console.log('Enviando dados da venda (limpos):', dadosLimpos);
      const response = await vendaService.criarVenda(dadosLimpos as any);
      
      toast.success('Venda criada com sucesso!');
      
      // Feedback sobre cadastro automático de cliente
      if (temMedicamentoControlado && cadastrarPacienteComoCliente && pacienteNome && pacienteCpf) {
        toast.success(`Cliente cadastrado/atualizado automaticamente: ${pacienteNome}`);
      }
      
      try {
        // Finalizar pagamento automaticamente
        await vendaService.finalizarPagamento(response.id);
        toast.success('Pagamento finalizado com sucesso!');
        
        // Se tem medicamento controlado, mostrar aviso sobre arquivamento
        if (temMedicamentoControlado) {
          toast.success('Lembre-se: registre o arquivamento da receita para continuar vendendo!');
        }
        
      } catch (paymentError: any) {
        console.error('Erro ao finalizar pagamento:', paymentError);
        toast.error('Venda criada, mas houve erro ao finalizar pagamento');
      }
      
      navigate(`/vendas/${response.id}`);
    } catch (error: any) {
      console.error('Erro ao finalizar venda:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  };

  // Formatação de valores
  const formatarValor = (valor: number | undefined | null) => {
    const valorSeguro = Number(valor) || 0;
    return valorSeguro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nova Venda</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Busca de produtos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 mb-8">
              <h2 className="text-lg font-semibold mb-4">Adicionar Produtos</h2>
              
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Produto</label>
                  <div className="space-y-3">
                    <div className="flex">
                      <input
                        type="text"
                        value={termoBuscaProduto}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTermoBuscaProduto(value);
                          
                          // Buscar automaticamente conforme digita
                          if (value.length >= 2) {
                            buscarProdutosPorTermoComValor(value);
                          } else {
                            setProdutosEncontrados([]);
                          }
                        }}
                        className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite o nome, laboratório, princípio ativo ou código de barras"
                      />
                      <button
                        onClick={buscarProdutosPorTermo}
                        disabled={termoBuscaProduto.length < 2}
                        className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {buscandoProduto ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    
                    {produtosEncontrados.length > 0 && (
                      <div className="border border-gray-200 rounded-md max-h-80 overflow-y-auto bg-white shadow-sm z-10 relative">
                        {produtosEncontrados.map(produto => (
                          <div 
                            key={produto.id} 
                            className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => selecionarProduto(produto)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 truncate text-sm flex items-center">
                                  💊 {produto.nome}
                                  {produto.controlado && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Controlado
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  🏷️ Código: {produto.codigoBarras || 'Não informado'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600 text-sm">
                                  {formatarValor(produto.preco)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  📦 {produto.estoque} un.
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex space-x-4">
                                <span>🔬 ID: {produto.id.substring(0, 8)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {requerLoteObrigatorio(produto as any) ? (
                                  obterTipoProdutoLote(produto as any) === 'controlado' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      ⚠️ Controlado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      🎯 Lote Manual
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    🔄 FEFO Auto
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {produtoSelecionado && (
                <div className="border border-gray-200 rounded-md p-4 mb-4">
                  {/* Cabeçalho com título e botão cancelar */}
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Produto Selecionado
                    </h4>
                    <button
                      onClick={cancelarSelecao}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Cancelar seleção do produto"
                      aria-label="Cancelar seleção do produto"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Produto</p>
                      <p className="font-medium">{produtoSelecionado.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Preço Unitário</p>
                      <p className="font-medium">{formatarValor(produtoSelecionado.preco)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Estoque Disponível</p>
                      <p className="font-medium">{produtoSelecionado.estoque} unidades</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Controlado</p>
                      <p className="font-medium">{produtoSelecionado.controlado ? 'Sim' : 'Não'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Controle de Lote</p>
                      <p className="font-medium flex items-center">
                        {produtoSelecionado.loteObrigatorio ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Manual
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Automático (FEFO)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantidade
                        <span className="text-xs text-gray-500 ml-1">
                          (Disponível: {calcularEstoqueDisponivel(produtoSelecionado.id, produtoSelecionado.estoque)})
                        </span>
                      </label>
                      <input
                        id="quantidade-input"
                        type="number"
                        min="1"
                        max={calcularEstoqueDisponivel(produtoSelecionado.id, produtoSelecionado.estoque)}
                        value={quantidade}
                        onChange={(e) => {
                          const novaQuantidade = parseInt(e.target.value) || 0;
                          const estoqueDisponivel = calcularEstoqueDisponivel(produtoSelecionado.id, produtoSelecionado.estoque);
                          
                          // Validar que a quantidade não excede o estoque disponível
                          if (novaQuantidade > estoqueDisponivel) {
                            toast.error(`Quantidade máxima disponível: ${estoqueDisponivel} (já há ${itensVenda.find(item => item.produtoId === produtoSelecionado.id)?.quantidade || 0} na venda)`);
                            setQuantidade(estoqueDisponivel);
                          } else if (novaQuantidade < 0) {
                            setQuantidade(1);
                          } else {
                            setQuantidade(novaQuantidade);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {promocaoAplicavel && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Promoção</label>
                        <p className="py-2 text-sm text-green-700 bg-green-50 rounded-md px-3">
                          {promocaoAplicavel.nome}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Economia</label>
                      <p className="py-2 font-medium text-green-600">
                        {descontoPromocao > 0 ? `- ${formatarValor(descontoPromocao * quantidade)}` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                      <p className="py-2 font-medium">
                        {formatarValor(precoPromocional > 0 ? precoPromocional * quantidade : (Number(produtoSelecionado?.preco) || 0) * quantidade)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={adicionarItem}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Adicionar à Venda
                    </button>
                  </div>
                </div>
              )}
              
              {/* Lista de itens da venda */}
              <div>
                <h3 className="text-md font-semibold mb-2">Itens da Venda</h3>
                
                {itensVenda.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum item adicionado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                            Produto
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            Qtd
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Preço
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Desc.
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Economia
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                            %
                          </th>
                          <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            Subtotal
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {itensVenda.map((item, index) => {
                          const produto = item.produto as any;
                          const precoUnitario = Number(item.precoUnitario) || 0;
                          const quantidade = Number(item.quantidade) || 0;
                          const desconto = Number(item.desconto) || 0;
                          const precoOriginal = precoUnitario * quantidade;
                          // Correção: item.desconto já é o desconto total, não multiplicar novamente
                          const descontoTotal = desconto; // desconto já é total
                          const economia = descontoTotal;
                          const percentualEconomia = calcularPercentualEconomia(precoOriginal, descontoTotal);
                          // Correção crítica: garantir que subtotal nunca seja negativo
                          const subtotal = Math.max(0, precoOriginal - descontoTotal);
                          const promocaoAplicada = promocoesAplicadas[index];
                          
                          return (
                            <tr key={index} className={produto?.controlado ? 'bg-yellow-50 border-l-4 border-yellow-400' : promocaoAplicada ? 'bg-green-50 border-l-4 border-green-400' : ''}>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                <div className="flex items-center">
                                  <span className="truncate max-w-[200px]" title={produto?.nome || 'Produto'}>
                                    {produto?.nome || 'Produto'}
                                  </span>
                                  {produto?.controlado && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                      ⚠️
                                    </span>
                                  )}
                                  {promocaoAplicada && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      ⚡
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center text-sm text-gray-700 font-medium">
                                {item.quantidade}
                              </td>
                              <td className="px-2 py-2 text-right text-sm text-gray-600">
                                {formatarValor(precoUnitario)}
                              </td>
                              <td className="px-2 py-2 text-right text-sm text-gray-600">
                                {desconto > 0 ? formatarValor(desconto) : '-'}
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-medium text-green-600">
                                {economia > 0 ? formatarValor(economia) : '-'}
                              </td>
                              <td className="px-2 py-2 text-center text-sm font-medium">
                                {percentualEconomia > 0 ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {percentualEconomia.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-gray-900">
                                {formatarValor(subtotal)}
                              </td>
                              <td className="px-2 py-2 text-center text-sm">
                                <button
                                  onClick={() => removerItem(index)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Remover item"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Linha separadora com espaçamento */}
                        {itensVenda.length > 0 && (
                          <>
                            <tr className="bg-transparent">
                              <td colSpan={6} className="h-4"></td>
                            </tr>
                            
                            {/* Linha de resumo/total com visual destacado */}
                            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
                              <td colSpan={8} className="px-4 py-4">
                                <div className="flex items-center justify-between">
                                  {/* Título do Resumo */}
                                  <div className="flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 100 2h.01a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                      <h3 className="text-white text-base font-bold">RESUMO DA COMPRA</h3>
                                      <p className="text-blue-100 text-xs">Totalizadores</p>
                                    </div>
                                  </div>
                                  
                                  {/* Grid de valores */}
                                  <div className="flex items-center space-x-6">
                                    {/* Variedades */}
                                    <div className="text-center">
                                      <div className="text-blue-100 text-xs uppercase tracking-wider mb-1">📦 Produtos</div>
                                      <div className="text-white text-xl font-bold">
                                        {calcularVariedadesProdutos()}
                                      </div>
                                      <div className="text-blue-200 text-xs">
                                        tipo{calcularVariedadesProdutos() !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                    
                                    {/* Quantidade Total */}
                                    <div className="text-center">
                                      <div className="text-blue-100 text-xs uppercase tracking-wider mb-1">🔢 Qtd</div>
                                      <div className="text-white text-xl font-bold">
                                        {calcularQuantidadeTotal()}
                                      </div>
                                      <div className="text-blue-200 text-xs">unidades</div>
                                    </div>
                                    
                                    {/* Desconto Total */}
                                    <div className="text-center">
                                      <div className="text-blue-100 text-xs uppercase tracking-wider mb-1">🏷️ Descontos</div>
                                      <div className="text-yellow-300 text-xl font-bold">
                                        {formatarValor(calcularDescontoTotal())}
                                      </div>
                                      <div className="text-blue-200 text-xs">aplicados</div>
                                    </div>
                                    
                                    {/* Economia Total */}
                                    <div className="text-center bg-green-500 bg-opacity-30 rounded-lg px-3 py-2">
                                      <div className="text-green-100 text-xs uppercase tracking-wider mb-1">💰 Economia</div>
                                      <div className="text-green-100 text-xl font-bold">
                                        {formatarValor(calcularDescontoTotal() + calcularEconomiaTotal())}
                                      </div>
                                      <div className="text-green-200 text-xs">total</div>
                                    </div>
                                    
                                    {/* Percentual de Economia */}
                                    <div className="text-center bg-purple-500 bg-opacity-30 rounded-lg px-3 py-2">
                                      <div className="text-purple-100 text-xs uppercase tracking-wider mb-1">📊 % Economia</div>
                                      <div className="text-purple-100 text-xl font-bold">
                                        {calcularPercentualTotalEconomia().toFixed(1)}%
                                      </div>
                                      <div className="text-purple-200 text-xs">do total</div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Dados da venda e finalização */}
          <div>
            <div className={`bg-white rounded-lg shadow-md p-4 mb-8 ${temMedicamentoControlado ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500'}`}>
              <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold">
                  {temMedicamentoControlado ? 'Dados do Cliente' : 'Dados do Cliente (Opcional)'}
                </h2>
                {temMedicamentoControlado ? (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Obrigatório
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Opcional
                  </span>
                )}
              </div>
              

              
              {clienteSelecionado ? (
                <div className="mb-4">
                  <div className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{clienteSelecionado.nome}</p>
                        <p className="text-sm text-gray-500">{clienteSelecionado.tipoDocumento}: {clienteSelecionado.documento}</p>
                      </div>
                      <button
                        onClick={() => setClienteSelecionado(null)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                        title="Remover cliente"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Buscar Cliente {temMedicamentoControlado && <span className="text-red-500">*</span>}
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={termoBuscaCliente}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Aplicar máscara inteligente se for documento numérico
                          const maskedValue = isName(value) ? value : applySmartDocumentMask(value);
                          setTermoBuscaCliente(maskedValue);
                          
                          // Buscar automaticamente conforme digita
                          if (maskedValue.length >= 2) {
                            buscarClientesPorTermoComValor(maskedValue);
                          } else {
                            setClientesEncontrados([]);
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Digite o nome, CPF, CNPJ ou passaporte do cliente"
                      />
                      
                      <button
                        onClick={buscarClientesPorTermo}
                        disabled={termoBuscaCliente.length < 2}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {buscandoCliente ? 'Buscando...' : 'Buscar Cliente'}
                      </button>
                    </div>
                    
                    {clientesEncontrados.length > 0 && (
                      <div className="mt-3 border border-gray-200 rounded-md max-h-48 overflow-y-auto bg-white shadow-sm z-10 relative">
                        {clientesEncontrados.map(cliente => (
                          <div 
                            key={cliente.id} 
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => selecionarCliente(cliente)}
                          >
                            <p className="font-medium text-gray-900 truncate text-sm">
                              {cliente.nome}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {cliente.tipoDocumento}: {cliente.documento || 'Não informado'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Seção de Medicamento Controlado e Dados do Paciente */}
            {temMedicamentoControlado && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-4 mb-8">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-yellow-800">
                      Medicamento Controlado Detectado
                    </h2>
                    <p className="text-sm text-yellow-700 mt-1">
                      Receita médica e dados do paciente são obrigatórios
                    </p>
                  </div>
                </div>
                
                {/* Dados da Receita */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número da Receita *
                    </label>
                    <input
                      type="text"
                      value={numeroReceita}
                      onChange={(e) => setNumeroReceita(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: REC123456789"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mínimo 8 caracteres
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data da Receita *
                    </label>
                    <input
                      type="date"
                      value={dataReceita}
                      onChange={(e) => setDataReceita(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Validade: 30 dias
                    </p>
                  </div>
                </div>

                {/* Dados do Paciente */}
                <div className="border-t border-yellow-200 pt-4">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-yellow-800">
                      Dados do Paciente (Dono da Receita)
                    </h3>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                      Obrigatório
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Paciente *
                      </label>
                      <input
                        type="text"
                        value={pacienteNome}
                        onChange={(e) => setPacienteNome(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome completo do paciente"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Mínimo 3 caracteres
                      </p>
                    </div>
                    
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         CPF do Paciente *
                       </label>
                       <input
                         type="text"
                         value={pacienteCpf}
                         onChange={(e) => {
                           const value = e.target.value;
                           const maskedValue = applySmartDocumentMask(value);
                           setPacienteCpf(maskedValue);
                         }}
                         className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="Digite o CPF do paciente"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         RG do Paciente *
                       </label>
                       <input
                         type="text"
                         value={pacienteRg}
                         onChange={(e) => setPacienteRg(e.target.value)}
                         className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="Digite o RG do paciente"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Telefone do Paciente *
                       </label>
                       <input
                         type="tel"
                         value={pacienteTelefone}
                         onChange={(e) => {
                           const value = e.target.value;
                           const maskedValue = formatarTelefone(value);
                           setPacienteTelefone(maskedValue);
                         }}
                         className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                         placeholder="(00) 00000-0000"
                       />
                       <p className="text-xs text-gray-500 mt-1">
                         Formato: (XX) XXXXX-XXXX
                       </p>
                     </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Endereço do Paciente *
                      </label>
                      <input
                        type="text"
                        value={pacienteEndereco}
                        onChange={(e) => setPacienteEndereco(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Endereço completo do paciente"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Mínimo 10 caracteres
                      </p>
                    </div>
                  </div>
                  
                  {/* Checkbox para cadastrar paciente como cliente */}
                  <div className="mt-6 pt-4 border-t border-yellow-200">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={cadastrarPacienteComoCliente}
                        onChange={(e) => setCadastrarPacienteComoCliente(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-700">
                          Cadastrar paciente como cliente automaticamente
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          Os dados do paciente serão utilizados para criar ou atualizar o cadastro de cliente, 
                          facilitando futuras vendas e controle de histórico.
                        </p>
                        {cadastrarPacienteComoCliente && pacienteNome && pacienteCpf && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-xs text-green-800">
                              <strong>Será cadastrado:</strong> {pacienteNome} - CPF: {pacienteCpf}
                              {pacienteTelefone && ` - Tel: ${pacienteTelefone}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                </div>
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow-md p-4 mb-8">
              <h2 className="text-lg font-semibold mb-4">Dados da Venda</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={FormaPagamento.DINHEIRO}>Dinheiro</option>
                  <option value={FormaPagamento.CARTAO_CREDITO}>Cartão de Crédito</option>
                  <option value={FormaPagamento.CARTAO_DEBITO}>Cartão de Débito</option>
                  <option value={FormaPagamento.PIX}>PIX</option>
                  <option value={FormaPagamento.BOLETO}>Boleto</option>
                  <option value={FormaPagamento.TRANSFERENCIA}>Transferência</option>
                  <option value={FormaPagamento.CREDITO_LOJA}>Crédito na Loja</option>
                </select>
              </div>
              

              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações sobre a venda"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-4 mb-8">
              <h2 className="text-lg font-semibold mb-4">Resumo da Venda</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatarValor(valorTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Descontos:</span>
                  <span className="text-red-600">-{formatarValor(valorDesconto)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatarValor(valorFinal)}</span>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => navigate('/vendas')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                
                <div className="flex flex-col items-end">
                  {temMedicamentoControlado && (!validacaoReceita.valida || (!clienteId && (!clienteNome || !clienteDocumento)) || !pacienteNome || !pacienteCpf || !pacienteRg || !pacienteEndereco || !pacienteTelefone) && (
                    <div className="mb-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Dados obrigatórios pendentes para medicamentos controlados
                    </div>
                  )}
                  
                  <button
                    onClick={finalizarVenda}
                    disabled={loading || itensVenda.length === 0 || (temMedicamentoControlado && (!validacaoReceita.valida || (!clienteId && (!clienteNome || !clienteDocumento)) || !pacienteNome || !pacienteCpf || !pacienteRg || !pacienteEndereco || !pacienteTelefone))}
                    className={`px-6 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      loading || itensVenda.length === 0 || (temMedicamentoControlado && (!validacaoReceita.valida || (!clienteId && (!clienteNome || !clienteDocumento)) || !pacienteNome || !pacienteCpf || !pacienteRg || !pacienteEndereco || !pacienteTelefone))
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {loading
                      ? 'Processando...'
                      : temMedicamentoControlado && (!validacaoReceita.valida || (!clienteId && (!clienteNome || !clienteDocumento)) || !pacienteNome || !pacienteCpf || !pacienteRg || !pacienteEndereco || !pacienteTelefone)
                      ? 'Dados Obrigatórios Pendentes'
                      : 'Finalizar Venda'
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Lotes */}
      {produtoParaLotes && (
        <SeletorLotesModal
          isOpen={seletorLotesAberto}
          onClose={() => {
            setSeletorLotesAberto(false);
            setProdutoParaLotes(null);
            setQuantidadeParaLotes(0);
          }}
          produto={produtoParaLotes as any}
          quantidade={quantidadeParaLotes}
          onConfirmar={processarSelecaoLotes}
        />
      )}
    </Layout>
  );
};

export default NovaVendaPage;


// Função para aplicar máscara de CPF