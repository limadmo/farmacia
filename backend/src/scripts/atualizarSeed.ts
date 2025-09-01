/**
 * Script para atualizar o arquivo seed.ts com CPFs e CNPJs válidos
 */

import * as fs from 'fs';
import * as path from 'path';
import { validarCPF, validarCNPJ, gerarCPFValido, gerarCNPJValido } from '../utils/validadorDocumento';

// Caminho para o arquivo seed.ts
const seedFilePath = path.resolve(__dirname, '../database/seed.ts');

// Lê o conteúdo do arquivo seed.ts
let seedContent = fs.readFileSync(seedFilePath, 'utf8');

// Função para substituir CPFs inválidos
function substituirCPFsInvalidos(content: string): string {
  // Regex para encontrar objetos de cliente com CPF
  const regexCliente = /\{\s*nome:\s*['"](.*?)['"],\s*cpf:\s*['"](.*?)['"],\s*email:/g;
  
  return content.replace(regexCliente, (match, nome, cpf) => {
    if (!validarCPF(cpf)) {
      const novoCPF = gerarCPFValido();
      console.log(`CPF inválido substituído: ${cpf} -> ${novoCPF} (${nome})`);
      return match.replace(`cpf: '${cpf}'`, `cpf: '${novoCPF}'`);
    }
    return match;
  });
}

// Função para substituir CNPJs inválidos
function substituirCNPJsInvalidos(content: string): string {
  // Regex para encontrar objetos de fornecedor com CNPJ
  const regexFornecedor = /\{\s*nome:\s*['"](.*?)['"],\s*cnpj:\s*['"](.*?)['"],\s*email:/g;
  
  return content.replace(regexFornecedor, (match, nome, cnpj) => {
    // Remove caracteres não numéricos para validação
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
    if (!validarCNPJ(cnpjLimpo)) {
      const novoCNPJ = gerarCNPJValido();
      console.log(`CNPJ inválido substituído: ${cnpj} -> ${novoCNPJ} (${nome})`);
      return match.replace(`cnpj: '${cnpj}'`, `cnpj: '${novoCNPJ}'`);
    }
    return match;
  });
}

// Substitui CPFs e CNPJs inválidos
seedContent = substituirCPFsInvalidos(seedContent);
seedContent = substituirCNPJsInvalidos(seedContent);

// Escreve o conteúdo atualizado no arquivo seed.ts
fs.writeFileSync(seedFilePath, seedContent, 'utf8');

console.log('Arquivo seed.ts atualizado com sucesso!');