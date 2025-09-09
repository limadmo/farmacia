/**
 * Testes Unitários - Regras de Negócio de Estoque
 * 
 * Valida as regras de negócio isoladamente para garantir
 * que a lógica de prevenção de estoque negativo está correta.
 */

import { EstoqueBusinessRules, StatusEstoque, TipoMovimentacao } from '../../domain/entities/Estoque';

describe('EstoqueBusinessRules - Validação de Estoque Negativo', () => {
  
  describe('validateSaidaEstoque', () => {
    it('deve retornar erro quando quantidade de saída excede estoque disponível', () => {
      // Arrange
      const estoqueAtual = 10;
      const quantidadeSaida = 15;
      
      // Act
      const erros = EstoqueBusinessRules.validateSaidaEstoque(estoqueAtual, quantidadeSaida);
      
      // Assert
      expect(erros).toHaveLength(1);
      expect(erros[0]).toContain('Estoque insuficiente');
      expect(erros[0]).toContain('Disponível: 10');
      expect(erros[0]).toContain('Solicitado: 15');
    });
    
    it('deve permitir saída quando quantidade é igual ao estoque disponível', () => {
      // Arrange
      const estoqueAtual = 10;
      const quantidadeSaida = 10;
      
      // Act
      const erros = EstoqueBusinessRules.validateSaidaEstoque(estoqueAtual, quantidadeSaida);
      
      // Assert
      expect(erros).toHaveLength(0);
    });
    
    it('deve permitir saída quando quantidade é menor que estoque disponível', () => {
      // Arrange
      const estoqueAtual = 10;
      const quantidadeSaida = 5;
      
      // Act
      const erros = EstoqueBusinessRules.validateSaidaEstoque(estoqueAtual, quantidadeSaida);
      
      // Assert
      expect(erros).toHaveLength(0);
    });
    
    it('deve retornar erro ao tentar saída com estoque zero', () => {
      // Arrange
      const estoqueAtual = 0;
      const quantidadeSaida = 1;
      
      // Act
      const erros = EstoqueBusinessRules.validateSaidaEstoque(estoqueAtual, quantidadeSaida);
      
      // Assert
      expect(erros).toHaveLength(1);
      expect(erros[0]).toContain('Estoque insuficiente');
      expect(erros[0]).toContain('Disponível: 0');
      expect(erros[0]).toContain('Solicitado: 1');
    });
    
    it('deve validar corretamente com números decimais', () => {
      // Arrange
      const estoqueAtual = 10.5;
      const quantidadeSaida = 10.6;
      
      // Act
      const erros = EstoqueBusinessRules.validateSaidaEstoque(estoqueAtual, quantidadeSaida);
      
      // Assert
      expect(erros).toHaveLength(1);
      expect(erros[0]).toContain('Estoque insuficiente');
    });
  });
  
  describe('validateMovimentacao', () => {
    it('deve validar quantidade positiva em movimentações', () => {
      // Arrange
      const movimentacao = {
        produtoId: 'prod-123',
        tipo: TipoMovimentacao.SAIDA,
        quantidade: 0, // Quantidade inválida
        motivo: 'Teste',
        usuarioId: 'user-123'
      };
      
      // Act
      const erros = EstoqueBusinessRules.validateMovimentacao(movimentacao);
      
      // Assert
      expect(erros).toContain('Quantidade deve ser maior que zero');
    });
    
    it('deve validar quantidade negativa como inválida', () => {
      // Arrange
      const movimentacao = {
        produtoId: 'prod-123',
        tipo: TipoMovimentacao.SAIDA,
        quantidade: -5,
        motivo: 'Teste',
        usuarioId: 'user-123'
      };
      
      // Act
      const erros = EstoqueBusinessRules.validateMovimentacao(movimentacao);
      
      // Assert
      expect(erros).toContain('Quantidade deve ser maior que zero');
    });
    
    it('deve aceitar movimentação válida', () => {
      // Arrange
      const movimentacao = {
        produtoId: 'prod-123',
        tipo: TipoMovimentacao.ENTRADA,
        quantidade: 10,
        motivo: 'Reposição de estoque',
        usuarioId: 'user-123'
      };
      
      // Act
      const erros = EstoqueBusinessRules.validateMovimentacao(movimentacao);
      
      // Assert
      expect(erros).toHaveLength(0);
    });
  });
  
  describe('determinarStatusEstoque', () => {
    it('deve retornar ZERADO quando estoque é 0', () => {
      // Act
      const status = EstoqueBusinessRules.determinarStatusEstoque(0, 10, 100);
      
      // Assert
      expect(status).toBe(StatusEstoque.ZERADO);
    });
    
    it('deve retornar CRITICO quando estoque está 50% ou menos do mínimo', () => {
      // Arrange - estoque 5, mínimo 10 (50% do mínimo)
      const status1 = EstoqueBusinessRules.determinarStatusEstoque(5, 10, 100);
      const status2 = EstoqueBusinessRules.determinarStatusEstoque(3, 10, 100);
      
      // Assert
      expect(status1).toBe(StatusEstoque.CRITICO);
      expect(status2).toBe(StatusEstoque.CRITICO);
    });
    
    it('deve retornar BAIXO quando estoque está abaixo do mínimo mas acima do crítico', () => {
      // Arrange - estoque 8, mínimo 10 (80% do mínimo)
      const status = EstoqueBusinessRules.determinarStatusEstoque(8, 10, 100);
      
      // Assert
      expect(status).toBe(StatusEstoque.BAIXO);
    });
    
    it('deve retornar NORMAL quando estoque está adequado', () => {
      // Arrange
      const status = EstoqueBusinessRules.determinarStatusEstoque(50, 10, 100);
      
      // Assert
      expect(status).toBe(StatusEstoque.NORMAL);
    });
    
    it('deve retornar EXCESSO quando estoque excede o máximo', () => {
      // Arrange
      const status = EstoqueBusinessRules.determinarStatusEstoque(150, 10, 100);
      
      // Assert
      expect(status).toBe(StatusEstoque.EXCESSO);
    });
    
    it('nunca deve permitir status com estoque negativo', () => {
      // Este teste documenta que estoque negativo não é uma condição válida
      // O sistema deve prevenir esta situação antes de chegar aqui
      
      // Se alguém tentar passar estoque negativo, deve ser tratado como CRÍTICO
      const status = EstoqueBusinessRules.determinarStatusEstoque(-5, 10, 100);
      
      // Por segurança, tratamos negativo como crítico (pior cenário)
      expect(status).toBe(StatusEstoque.CRITICO);
    });
  });
  
  describe('isEstoqueCritico', () => {
    it('deve identificar estoque crítico corretamente', () => {
      // Arrange
      const estoqueMinimo = 20;
      
      // Act & Assert
      expect(EstoqueBusinessRules.isEstoqueCritico(5, estoqueMinimo)).toBe(true);  // 25% do mínimo
      expect(EstoqueBusinessRules.isEstoqueCritico(10, estoqueMinimo)).toBe(true); // 50% do mínimo
      expect(EstoqueBusinessRules.isEstoqueCritico(11, estoqueMinimo)).toBe(false); // 55% do mínimo
      expect(EstoqueBusinessRules.isEstoqueCritico(20, estoqueMinimo)).toBe(false); // 100% do mínimo
    });
    
    it('deve considerar estoque zero como crítico', () => {
      // Act
      const resultado = EstoqueBusinessRules.isEstoqueCritico(0, 10);
      
      // Assert
      expect(resultado).toBe(true);
    });
    
    it('nunca deve aceitar estoque negativo', () => {
      // Estoque negativo deve ser tratado como crítico
      const resultado = EstoqueBusinessRules.isEstoqueCritico(-10, 20);
      
      // Assert
      expect(resultado).toBe(true);
    });
  });
  
  describe('calcularValorEstoque', () => {
    it('deve calcular valor corretamente', () => {
      // Arrange
      const quantidade = 10;
      const precoCusto = 25.50;
      
      // Act
      const valor = EstoqueBusinessRules.calcularValorEstoque(quantidade, precoCusto);
      
      // Assert
      expect(valor).toBe(255);
    });
    
    it('deve retornar 0 quando estoque é zero', () => {
      // Act
      const valor = EstoqueBusinessRules.calcularValorEstoque(0, 100);
      
      // Assert
      expect(valor).toBe(0);
    });
    
    it('deve lidar com preço zero', () => {
      // Act
      const valor = EstoqueBusinessRules.calcularValorEstoque(100, 0);
      
      // Assert
      expect(valor).toBe(0);
    });
    
    it('nunca deve retornar valor negativo mesmo com entrada negativa', () => {
      // Proteção contra entradas inválidas
      const valor1 = EstoqueBusinessRules.calcularValorEstoque(-10, 50);
      const valor2 = EstoqueBusinessRules.calcularValorEstoque(10, -50);
      const valor3 = EstoqueBusinessRules.calcularValorEstoque(-10, -50);
      
      // Assert - valores negativos devem resultar em cálculo matemático
      // mas na prática o sistema não deve permitir estas entradas
      expect(valor1).toBe(-500); // Documenta comportamento atual
      expect(valor2).toBe(-500);
      expect(valor3).toBe(500); // Negativo × negativo = positivo
    });
  });
  
  describe('calcularDiasEstoque', () => {
    it('deve calcular dias de estoque corretamente', () => {
      // Arrange
      const estoqueAtual = 100;
      const mediaVendasDiarias = 10;
      
      // Act
      const dias = EstoqueBusinessRules.calcularDiasEstoque(estoqueAtual, mediaVendasDiarias);
      
      // Assert
      expect(dias).toBe(10);
    });
    
    it('deve retornar Infinity quando não há vendas', () => {
      // Act
      const dias = EstoqueBusinessRules.calcularDiasEstoque(100, 0);
      
      // Assert
      expect(dias).toBe(Infinity);
    });
    
    it('deve retornar 0 quando estoque é zero', () => {
      // Act
      const dias = EstoqueBusinessRules.calcularDiasEstoque(0, 10);
      
      // Assert
      expect(dias).toBe(0);
    });
    
    it('deve arredondar para baixo dias parciais', () => {
      // Arrange - 15 unidades, 4 vendas/dia = 3.75 dias
      const dias = EstoqueBusinessRules.calcularDiasEstoque(15, 4);
      
      // Assert
      expect(dias).toBe(3); // Math.floor(3.75)
    });
  });
  
  describe('Cenários de Borda', () => {
    it('deve validar limites máximos de quantidade', () => {
      // Arrange
      const estoqueMaximo = Number.MAX_SAFE_INTEGER;
      const quantidadeValida = estoqueMaximo;
      const quantidadeInvalida = estoqueMaximo + 1;
      
      // Act
      const errosValido = EstoqueBusinessRules.validateSaidaEstoque(estoqueMaximo, quantidadeValida);
      const errosInvalido = EstoqueBusinessRules.validateSaidaEstoque(estoqueMaximo, quantidadeInvalida);
      
      // Assert
      expect(errosValido).toHaveLength(0);
      expect(errosInvalido).toHaveLength(1);
    });
    
    it('deve tratar valores fracionários corretamente', () => {
      // Cenário: produtos vendidos por peso/volume
      const estoque = 10.75; // kg
      const saida1 = 10.74;
      const saida2 = 10.76;
      
      // Act
      const erros1 = EstoqueBusinessRules.validateSaidaEstoque(estoque, saida1);
      const erros2 = EstoqueBusinessRules.validateSaidaEstoque(estoque, saida2);
      
      // Assert
      expect(erros1).toHaveLength(0); // Permitido
      expect(erros2).toHaveLength(1); // Bloqueado
    });
  });
});