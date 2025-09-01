/**
 * Testes para controle de acesso e permissões
 */

import { TipoUsuario } from '@prisma/client';
import { 
  PERMISSOES_MODULOS, 
  PERMISSOES_FINANCEIRAS,
  temPermissaoModulo, 
  temPermissaoFinanceira,
  filtrarDadosSensiveis
} from '@/constants/permissions';

describe('Controle de Acesso - Permissões por Perfil', () => {
  
  describe('Acesso aos módulos', () => {
    test('ADMINISTRADOR deve ter acesso a todos os módulos', () => {
      expect(temPermissaoModulo(TipoUsuario.ADMINISTRADOR, 'produtos')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.ADMINISTRADOR, 'usuarios')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.ADMINISTRADOR, 'relatorios')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.ADMINISTRADOR, 'vendas')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.ADMINISTRADOR, 'clientes')).toBe(true);
    });

    test('VENDEDOR deve ter acesso apenas a vendas e clientes', () => {
      expect(temPermissaoModulo(TipoUsuario.VENDEDOR, 'vendas')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.VENDEDOR, 'clientes')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.VENDEDOR, 'produtos')).toBe(false);
      expect(temPermissaoModulo(TipoUsuario.VENDEDOR, 'usuarios')).toBe(false);
      expect(temPermissaoModulo(TipoUsuario.VENDEDOR, 'relatorios')).toBe(false);
    });

    test('PDV deve ter acesso apenas a vendas e clientes', () => {
      expect(temPermissaoModulo(TipoUsuario.PDV, 'vendas')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.PDV, 'clientes')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.PDV, 'produtos')).toBe(false);
      expect(temPermissaoModulo(TipoUsuario.PDV, 'usuarios')).toBe(false);
      expect(temPermissaoModulo(TipoUsuario.PDV, 'relatorios')).toBe(false);
    });

    test('GERENTE deve ter acesso amplo exceto usuários', () => {
      expect(temPermissaoModulo(TipoUsuario.GERENTE, 'produtos')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.GERENTE, 'vendas')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.GERENTE, 'usuarios')).toBe(true);
      expect(temPermissaoModulo(TipoUsuario.GERENTE, 'relatorios')).toBe(false);
    });
  });

  describe('Permissões financeiras', () => {
    test('Apenas ADMINISTRADOR deve ter acesso a dados financeiros sensíveis', () => {
      expect(temPermissaoFinanceira(TipoUsuario.ADMINISTRADOR, 'custos')).toBe(true);
      expect(temPermissaoFinanceira(TipoUsuario.ADMINISTRADOR, 'margens')).toBe(true);
      
      expect(temPermissaoFinanceira(TipoUsuario.GERENTE, 'custos')).toBe(false);
      expect(temPermissaoFinanceira(TipoUsuario.FARMACEUTICO, 'custos')).toBe(false);
      expect(temPermissaoFinanceira(TipoUsuario.VENDEDOR, 'custos')).toBe(false);
      expect(temPermissaoFinanceira(TipoUsuario.PDV, 'custos')).toBe(false);
    });
  });

  describe('Filtragem de dados sensíveis', () => {
    const produtoComDadosSensiveis = {
      id: '1',
      nome: 'Produto Teste',
      precoVenda: 100,
      precoCusto: 50,
      margem: 100,
      estoque: 10
    };

    test('ADMINISTRADOR deve ver todos os dados', () => {
      const resultado = filtrarDadosSensiveis(produtoComDadosSensiveis, TipoUsuario.ADMINISTRADOR);
      expect(resultado).toHaveProperty('precoCusto', 50);
      expect(resultado).toHaveProperty('margem', 100);
    });

    test('Outros usuários não devem ver dados sensíveis', () => {
      const resultadoVendedor = filtrarDadosSensiveis(produtoComDadosSensiveis, TipoUsuario.VENDEDOR);
      const resultadoGerente = filtrarDadosSensiveis(produtoComDadosSensiveis, TipoUsuario.GERENTE);
      
      expect(resultadoVendedor).not.toHaveProperty('precoCusto');
      expect(resultadoVendedor).not.toHaveProperty('margem');
      expect(resultadoVendedor).toHaveProperty('precoVenda', 100);
      
      expect(resultadoGerente).not.toHaveProperty('precoCusto');
      expect(resultadoGerente).not.toHaveProperty('margem');
      expect(resultadoGerente).toHaveProperty('precoVenda', 100);
    });
  });
});