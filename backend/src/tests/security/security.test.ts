/**
 * Testes de Segurança - Sistema de Farmácia
 * 
 * Verifica se as implementações de segurança estão funcionando
 */

import { describe, test, expect } from '@jest/globals';
import { Sanitizer } from '../../presentation/middleware/sanitizer';
import { commonSchemas, sanitizers } from '../../presentation/middleware/validator';

describe('Testes de Segurança', () => {
  
  describe('Sanitização HTML/XSS', () => {
    test('deve remover scripts maliciosos', () => {
      const input = '<script>alert("XSS")</script>Texto seguro';
      const result = Sanitizer.stripHTML(input);
      
      expect(result).toBe('Texto seguro');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('deve escapar caracteres HTML', () => {
      const input = '<div>Test & "quotes"</div>';
      const result = Sanitizer.escapeHTML(input);
      
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    test('deve sanitizar objetos complexos', () => {
      const input = {
        nome: '<script>alert("hack")</script>João',
        dados: {
          email: 'test@example.com',
          descricao: '<iframe src="evil.com"></iframe>Descrição'
        },
        lista: ['<script>evil</script>item1', 'item2']
      };

      const result = Sanitizer.sanitizeObject(input);
      
      expect(result.nome).toBe('João');
      expect(result.dados.descricao).toBe('Descrição');
      expect(result.lista[0]).toBe('item1');
    });
  });

  describe('Validação de Documentos', () => {
    test('deve validar CPF correto', () => {
      const cpfValido = '11144477735';
      const schema = commonSchemas.cpf;
      
      expect(() => schema.parse(cpfValido)).not.toThrow();
    });

    test('deve rejeitar CPF inválido', () => {
      const cpfInvalido = '11111111111';
      const schema = commonSchemas.cpf;
      
      expect(() => schema.parse(cpfInvalido)).toThrow();
    });

    test('deve validar CNPJ correto', () => {
      const cnpjValido = '11222333000181';
      const schema = commonSchemas.cnpj;
      
      expect(() => schema.parse(cnpjValido)).not.toThrow();
    });

    test('deve rejeitar CNPJ inválido', () => {
      const cnpjInvalido = '11222333000100';
      const schema = commonSchemas.cnpj;
      
      expect(() => schema.parse(cnpjInvalido)).toThrow();
    });
  });

  describe('Sanitização de Dados', () => {
    test('deve sanitizar telefone', () => {
      const telefone = '(11) 9 8888-7777';
      const result = sanitizers.numeric(telefone);
      
      expect(result).toBe('11988887777');
    });

    test('deve sanitizar email', () => {
      const email = 'Test.Email+tag@EXAMPLE.COM';
      const result = sanitizers.email(email);
      
      expect(result).toBe('test.email+tag@example.com');
    });

    test('deve sanitizar nome de arquivo', () => {
      const filename = '../../../etc/passwd';
      const result = sanitizers.filename(filename);
      
      expect(result).toBe('......etcpasswd');
      expect(result).not.toContain('../');
    });
  });

  describe('Proteção contra SQL Injection', () => {
    test('deve remover comandos SQL perigosos', () => {
      const input = "'; DROP TABLE users; --";
      const result = Sanitizer.sanitizeSQL(input);
      
      expect(result).not.toContain('DROP');
      expect(result).not.toContain('--');
      expect(result).not.toContain(';');
    });

    test('deve escapar aspas simples', () => {
      const input = "O'Reilly";
      const result = Sanitizer.sanitizeSQL(input);
      
      expect(result).toBe("O''Reilly");
    });
  });

  describe('Validação de UUIDs', () => {
    test('deve validar UUID correto', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const schema = commonSchemas.uuid;
      
      expect(() => schema.parse(uuid)).not.toThrow();
    });

    test('deve rejeitar UUID inválido', () => {
      const uuidInvalido = 'not-a-uuid';
      const schema = commonSchemas.uuid;
      
      expect(() => schema.parse(uuidInvalido)).toThrow();
    });
  });

  describe('Validação de Valores Monetários', () => {
    test('deve aceitar valores válidos', () => {
      const schema = commonSchemas.money;
      
      expect(() => schema.parse(100.50)).not.toThrow();
      expect(() => schema.parse(0)).not.toThrow();
      expect(() => schema.parse(999999.99)).not.toThrow();
    });

    test('deve rejeitar valores inválidos', () => {
      const schema = commonSchemas.money;
      
      expect(() => schema.parse(-1)).toThrow(); // Negativo
      expect(() => schema.parse(1000000000)).toThrow(); // Muito alto
      expect(() => schema.parse(10.123)).toThrow(); // Muitas casas decimais
    });
  });

  describe('Normalização de Strings', () => {
    test('deve normalizar espaços em branco', () => {
      const input = '  Texto   com    espaços   extras  ';
      const result = Sanitizer.normalizeWhitespace(input);
      
      expect(result).toBe('Texto com espaços extras');
    });

    test('deve remover caracteres de controle', () => {
      const input = 'Texto\x00\x01\x02normal';
      const result = Sanitizer.removeControlChars(input);
      
      expect(result).toBe('Textonormal');
    });
  });

  describe('Validação de Paginação', () => {
    test('deve validar parâmetros de paginação', () => {
      const schema = commonSchemas.pagination;
      const input = { page: '2', limit: '10' };
      
      const result = schema.parse(input);
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.order).toBe('asc'); // Default
    });

    test('deve aplicar limites aos parâmetros', () => {
      const schema = commonSchemas.pagination;
      
      expect(() => schema.parse({ page: '0' })).toThrow();
      expect(() => schema.parse({ page: '1001' })).toThrow();
      expect(() => schema.parse({ limit: '101' })).toThrow();
    });
  });

  describe('Validação de Intervalo de Datas', () => {
    test('deve validar datas corretas', () => {
      const schema = commonSchemas.dateRange;
      const input = {
        dataInicio: '2024-01-01',
        dataFim: '2024-12-31'
      };
      
      expect(() => schema.parse(input)).not.toThrow();
    });

    test('deve rejeitar intervalo inválido', () => {
      const schema = commonSchemas.dateRange;
      const input = {
        dataInicio: '2024-12-31',
        dataFim: '2024-01-01'
      };
      
      expect(() => schema.parse(input)).toThrow();
    });
  });
});

describe('Testes de Integração de Segurança', () => {
  test('deve processar dados complexos de forma segura', () => {
    const dadosPerigosos = {
      nome: '<script>alert("XSS")</script>João da Silva',
      email: 'JOAO.SILVA+TEST@EXAMPLE.COM',
      telefone: '(11) 9 8888-7777',
      documento: '111.444.777-35',
      endereco: '<iframe src="evil.com"></iframe>Rua das Flores, 123',
      observacoes: "'; DROP TABLE clientes; --",
      limiteCredito: '1000.50'
    };

    // Simular processamento completo
    const processado = Sanitizer.sanitizeObject(dadosPerigosos);
    
    // Verificar se foi sanitizado corretamente
    expect(processado.nome).toBe('João da Silva');
    expect(processado.endereco).toBe('Rua das Flores, 123');
    // A sanitização apenas remove HTML, não SQL injection no sanitizeObject
    expect(processado.observacoes).toContain('DROP'); // Ainda deve conter pois stripHTML não remove SQL
    expect(processado.observacoes).toContain('--');
  });

  test('deve detectar múltiplos ataques simultaneamente', () => {
    const ataqueComplexo = {
      campo1: '<script>document.cookie</script>',
      campo2: "' OR 1=1 --",
      campo3: '<iframe src="javascript:alert(1)">',
      campo4: '../../etc/passwd',
      campo5: 'eval(malicious_code)'
    };

    const resultado = Sanitizer.sanitizeObject(ataqueComplexo);
    
    // Verificar que ataques HTML foram neutralizados
    Object.values(resultado).forEach(valor => {
      expect(valor).not.toMatch(/<script/i);
      expect(valor).not.toMatch(/<iframe/i);
      // SQL injection e path traversal ainda podem estar presentes no sanitizeObject básico
      // pois ele só remove HTML. Para SQL, usamos sanitizeSQL separadamente
    });
  });
});