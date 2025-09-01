import { PrismaClient, TipoUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { cpf, cnpj } from 'cpf-cnpj-validator';
import { addDays, subDays, format } from 'date-fns';

// Configurar faker para português brasileiro
faker.locale = 'pt_BR';

const prisma = new PrismaClient();

// Utilidades para geração de dados válidos
class DataGenerator {
  // Gerar CPF válido
  static generateValidCPF(): string {
    return cpf.generate();
  }

  // Gerar CNPJ válido
  static generateValidCNPJ(): string {
    return cnpj.generate();
  }

  // Gerar código de barras EAN-13 válido
  static generateEAN13(): string {
    const prefix = '789'; // Código para Brasil
    const company = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const product = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    const partial = prefix + company + product;
    
    // Calcular dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(partial[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return partial + checkDigit;
  }

  // Gerar endereço brasileiro realístico
  static generateAddress() {
    const streets = [
      'Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Rua Oscar Freire', 'Av. Faria Lima',
      'Rua da Consolação', 'Av. Rebouças', 'Rua Teodoro Sampaio', 'Rua Haddock Lobo',
      'Av. Brigadeiro Luis Antônio', 'Rua Estados Unidos', 'Rua Pamplona', 'Av. Europa',
      'Rua Joaquim Floriano', 'Rua Funchal', 'Av. Nove de Julho', 'Rua Alameda Santos'
    ];
    
    const neighborhoods = [
      'Vila Madalena', 'Jardins', 'Pinheiros', 'Itaim Bibi', 'Vila Olímpia',
      'Moema', 'Brooklin', 'Campo Belo', 'Santo Amaro', 'Vila Nova Conceição',
      'Perdizes', 'Higienópolis', 'Santa Cecília', 'República', 'Liberdade'
    ];

    const cities = [
      { name: 'São Paulo', state: 'SP' },
      { name: 'Rio de Janeiro', state: 'RJ' },
      { name: 'Belo Horizonte', state: 'MG' },
      { name: 'Brasília', state: 'DF' },
      { name: 'Salvador', state: 'BA' },
      { name: 'Curitiba', state: 'PR' },
      { name: 'Fortaleza', state: 'CE' },
      { name: 'Recife', state: 'PE' },
      { name: 'Porto Alegre', state: 'RS' },
      { name: 'Goiânia', state: 'GO' }
    ];

    const street = faker.helpers.arrayElement(streets);
    const number = faker.number.int({ min: 10, max: 9999 });
    const neighborhood = faker.helpers.arrayElement(neighborhoods);
    const city = faker.helpers.arrayElement(cities);
    const cep = faker.location.zipCode('########').replace(/(\d{5})(\d{3})/, '$1-$2');

    return {
      full: `${street}, ${number} - ${neighborhood}, ${city.name} - ${city.state}`,
      cep,
      street,
      number: String(number),
      neighborhood,
      city: city.name,
      state: city.state
    };
  }

  // Gerar telefone brasileiro válido
  static generatePhone(): string {
    const ddd = faker.helpers.arrayElement(['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28']);
    const ninthDigit = faker.helpers.arrayElement(['9', '8', '7']);
    const number = faker.number.int({ min: 10000000, max: 99999999 });
    return `(${ddd}) ${ninthDigit}${String(number).substring(0, 4)}-${String(number).substring(4)}`;
  }

  // Gerar preço com margem realística
  static generatePrice(category: string, isGeneric: boolean = false): { venda: number, custo: number, margem: number } {
    const basePrices = {
      controlados: { min: 15, max: 150 },
      antibioticos: { min: 10, max: 80 },
      analgesicos: { min: 3, max: 25 },
      antiinflamatorios: { min: 8, max: 45 },
      vitaminas: { min: 12, max: 60 },
      dermocos: { min: 20, max: 120 },
      higiene: { min: 5, max: 35 },
      genericos: { min: 3, max: 40 },
      fitoterapicos: { min: 8, max: 50 },
      homeopaticos: { min: 10, max: 35 },
      cardiovasculares: { min: 25, max: 200 },
      respiratorios: { min: 15, max: 80 },
      gastrointestinais: { min: 8, max: 45 },
      neurologicos: { min: 30, max: 300 },
      endocrinos: { min: 40, max: 250 }
    };

    const range = basePrices[category as keyof typeof basePrices] || { min: 10, max: 50 };
    let precoVenda = faker.number.int({ min: range.min * 100, max: range.max * 100 }) / 100;
    
    // Aplicar desconto para genéricos
    if (isGeneric) {
      precoVenda *= 0.6; // 40% mais barato
    }

    // Margem entre 30% e 60%
    const margem = faker.number.int({ min: 30, max: 60 });
    const precoCusto = precoVenda / (1 + margem / 100);

    return {
      venda: Number(precoVenda.toFixed(2)),
      custo: Number(precoCusto.toFixed(2)),
      margem: Number(margem.toFixed(2))
    };
  }
}

async function main() {
  console.log('🌱 Iniciando seed completo do banco de dados...');

  // Limpeza de dados existentes
  console.log('🧹 Limpando dados existentes...');
  try {
    await prisma.itemVenda.deleteMany().catch(() => {});
    await prisma.venda.deleteMany().catch(() => {});
    await prisma.historicoCredito.deleteMany().catch(() => {});
    await prisma.movimentacaoEstoque.deleteMany().catch(() => {});
    await prisma.movimentacaoLote.deleteMany().catch(() => {});
    await prisma.itemVendaLote.deleteMany().catch(() => {});
    await prisma.lote.deleteMany().catch(() => {});
    await prisma.promocao.deleteMany().catch(() => {});
    await prisma.produtoFornecedor.deleteMany().catch(() => {});
    await prisma.produto.deleteMany().catch(() => {});
    await prisma.cliente.deleteMany().catch(() => {});
    await prisma.fornecedor.deleteMany().catch(() => {});
    await prisma.categoria.deleteMany().catch(() => {});
    await prisma.refreshToken.deleteMany().catch(() => {});
    await prisma.usuario.deleteMany().catch(() => {});
  } catch (error) {
    console.log('⚠️ Algumas tabelas podem não existir ainda, continuando...');
  }

  // FASE 1: Criação de usuários
  console.log('👥 Criando usuários do sistema...');
  const usuariosData = [
    {
      nome: 'Administrador Sistema',
      login: 'admin',
      senha: 'admin123',
      tipo: TipoUsuario.ADMINISTRADOR,
    },
    {
      nome: 'Carlos Eduardo Gerente',
      login: 'gerente',
      senha: 'gerente123',
      tipo: TipoUsuario.GERENTE,
    },
    {
      nome: 'Dra. Maria Fernanda Pharmacist',
      login: 'farmaceutico',
      senha: 'farmaceutico123',
      tipo: TipoUsuario.FARMACEUTICO,
    },
    {
      nome: 'João Carlos Vendedor',
      login: 'vendedor',
      senha: 'vendedor123',
      tipo: TipoUsuario.VENDEDOR,
    },
    {
      nome: 'Ana Paula PDV',
      login: 'pdv',
      senha: 'pdv123',
      tipo: TipoUsuario.PDV,
    },
  ];

  const usuarios = [];
  for (const usuarioData of usuariosData) {
    const senhaHash = await bcrypt.hash(usuarioData.senha, 12);
    const usuario = await prisma.usuario.create({
      data: {
        nome: usuarioData.nome,
        login: usuarioData.login,
        senhaHash: senhaHash,
        tipo: usuarioData.tipo,
        ativo: true,
      },
    });
    usuarios.push(usuario);
  }

  // FASE 2: Criação de categorias expandidas
  console.log('📂 Criando categorias de produtos...');
  const categoriasData = [
    { nome: 'Medicamentos Controlados', descricao: 'Medicamentos que requerem receita especial (A1, B1, C1)' },
    { nome: 'Antibióticos', descricao: 'Medicamentos para combate a infecções bacterianas' },
    { nome: 'Analgésicos', descricao: 'Medicamentos para alívio da dor' },
    { nome: 'Anti-inflamatórios', descricao: 'Medicamentos para redução de inflamações' },
    { nome: 'Vitaminas e Suplementos', descricao: 'Suplementos vitamínicos e minerais' },
    { nome: 'Dermocosméticos', descricao: 'Produtos para cuidados com a pele' },
    { nome: 'Higiene Pessoal', descricao: 'Produtos de higiene pessoal e bucal' },
    { nome: 'Medicamentos Genéricos', descricao: 'Medicamentos genéricos com eficácia comprovada' },
    { nome: 'Fitoterápicos', descricao: 'Medicamentos à base de plantas medicinais' },
    { nome: 'Homeopáticos', descricao: 'Medicamentos homeopáticos' },
    { nome: 'Cardiovasculares', descricao: 'Medicamentos para o sistema cardiovascular' },
    { nome: 'Respiratórios', descricao: 'Medicamentos para o sistema respiratório' },
    { nome: 'Gastrointestinais', descricao: 'Medicamentos para o sistema digestivo' },
    { nome: 'Neurológicos', descricao: 'Medicamentos para o sistema nervoso' },
    { nome: 'Endócrinos', descricao: 'Medicamentos para distúrbios hormonais' },
  ];

  const categorias = [];
  for (const catData of categoriasData) {
    const categoria = await prisma.categoria.create({
      data: {
        nome: catData.nome,
        descricao: catData.descricao,
        ativo: true,
      },
    });
    categorias.push(categoria);
  }

  // FASE 3: Criação de fornecedores realísticos
  console.log('🏢 Criando fornecedores farmacêuticos...');
  const fornecedoresData = [
    { nome: 'EMS S/A', cnpj: '57.507.378/0001-01', email: 'vendas@ems.com.br', telefone: '(19) 3891-9000' },
    { nome: 'Sanofi-Aventis Farmacêutica Ltda.', cnpj: '48.184.402/0001-10', email: 'brasil@sanofi.com', telefone: '(11) 2132-1000' },
    { nome: 'Novartis Biociências S.A.', cnpj: '56.994.502/0001-30', email: 'brasil@novartis.com', telefone: '(11) 5188-8000' },
    { nome: 'Pfizer Brasil Ltda.', cnpj: '46.070.868/0001-69', email: 'brasil@pfizer.com', telefone: '(11) 5185-8500' },
    { nome: 'Aché Laboratórios Farmacêuticos S.A.', cnpj: '60.659.463/0001-91', email: 'vendas@ache.com.br', telefone: '(11) 2608-6000' },
    { nome: 'Takeda Pharma Ltda.', cnpj: '64.968.733/0001-05', email: 'brasil@takeda.com', telefone: '(11) 5188-3000' },
    { nome: 'Eurofarma Laboratórios S.A.', cnpj: '61.190.096/0001-92', email: 'vendas@eurofarma.com.br', telefone: '(11) 5090-9000' },
    { nome: 'Roche Química e Farmacêutica S.A.', cnpj: '33.009.945/0023-39', email: 'brasil@roche.com', telefone: '(11) 3719-9999' },
    { nome: 'Bayer S.A.', cnpj: '18.459.628/0001-15', email: 'brasil@bayer.com', telefone: '(11) 3741-8000' },
    { nome: 'Abbott Laboratórios do Brasil Ltda.', cnpj: '56.998.982/0001-07', email: 'brasil@abbott.com', telefone: '(11) 5536-7000' }
  ];

  const fornecedores = [];
  for (const fornData of fornecedoresData) {
    const address = DataGenerator.generateAddress();
    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome: fornData.nome,
        cnpj: fornData.cnpj,
        email: fornData.email,
        telefone: fornData.telefone,
        endereco: address.full,
        representanteNome: faker.person.fullName(),
        representanteTelefone: DataGenerator.generatePhone(),
        representanteEmail: faker.internet.email(),
        ativo: true,
      },
    });
    fornecedores.push(fornecedor);
  }

  console.log(`✅ Primeira fase concluída: ${usuarios.length} usuários, ${categorias.length} categorias, ${fornecedores.length} fornecedores criados.`);

  // FASE 4: Criação de clientes CPF/CNPJ conforme especificado
  console.log('👤 Criando clientes com CPF (crédito 0, desabilitado)...');
  const clientesCPF = [];
  for (let i = 0; i < 70; i++) {
    const address = DataGenerator.generateAddress();
    const cliente = await prisma.cliente.create({
      data: {
        nome: faker.person.fullName(),
        documento: DataGenerator.generateValidCPF(),
        tipoDocumento: 'CPF',
        email: faker.internet.email(),
        telefone: DataGenerator.generatePhone(),
        endereco: address.full,
        limiteCredito: 0,
        creditoDisponivel: 0,
        creditoHabilitado: false,
        ativo: true,
      },
    });
    clientesCPF.push(cliente);
  }

  console.log('🏢 Criando clientes PJ com CNPJ (crédito 100-1500, habilitado)...');
  const clientesCNPJ = [];
  for (let i = 0; i < 30; i++) {
    const address = DataGenerator.generateAddress();
    const limiteCredito = faker.number.int({ min: 100, max: 1500 });
    const creditoUtilizado = faker.number.int({ min: 0, max: limiteCredito * 0.7 }); // Até 70% utilizado
    const creditoDisponivel = limiteCredito - creditoUtilizado;
    
    const cliente = await prisma.cliente.create({
      data: {
        nome: faker.company.name() + ' Ltda.',
        documento: DataGenerator.generateValidCNPJ(),
        tipoDocumento: 'CNPJ',
        email: faker.internet.email(),
        telefone: DataGenerator.generatePhone(),
        endereco: address.full,
        limiteCredito: limiteCredito,
        creditoDisponivel: creditoDisponivel,
        creditoHabilitado: true,
        ativo: true,
      },
    });
    clientesCNPJ.push(cliente);

    // Criar histórico de crédito para clientes PJ
    if (creditoUtilizado > 0) {
      await prisma.historicoCredito.create({
        data: {
          clienteId: cliente.id,
          tipo: 'UTILIZACAO',
          valor: creditoUtilizado,
          descricao: 'Crédito utilizado em compras anteriores',
          usuarioId: usuarios[0].id, // Admin
        },
      });
    }
  }

  const todosClientes = [...clientesCPF, ...clientesCNPJ];

  // FASE 5: Criação de produtos expandida (250+ produtos)
  console.log('💊 Criando base expandida de produtos (250+ itens)...');
  const produtosBase = [
    // Medicamentos Controlados (Categoria 0)
    { nome: 'Rivotril', principio: 'Clonazepam', concentracao: '2mg', forma: 'Comprimido', controlada: 'B1', receita: true, laboratorio: 'Roche' },
    { nome: 'Lexapro', principio: 'Escitalopram', concentracao: '10mg', forma: 'Comprimido', controlada: 'B1', receita: true, laboratorio: 'Lundbeck' },
    { nome: 'Ritalina', principio: 'Metilfenidato', concentracao: '10mg', forma: 'Comprimido', controlada: 'A1', receita: true, laboratorio: 'Novartis' },
    { nome: 'Alprazolam', principio: 'Alprazolam', concentracao: '0,5mg', forma: 'Comprimido', controlada: 'B1', receita: true, laboratorio: 'Pfizer' },
    { nome: 'Diazepam', principio: 'Diazepam', concentracao: '10mg', forma: 'Comprimido', controlada: 'B1', receita: true, laboratorio: 'Roche' },
    { nome: 'Fluoxetina', principio: 'Fluoxetina', concentracao: '20mg', forma: 'Cápsula', controlada: 'C1', receita: true, laboratorio: 'EMS' },
    { nome: 'Sertralina', principio: 'Sertralina', concentracao: '50mg', forma: 'Comprimido', controlada: 'C1', receita: true, laboratorio: 'Pfizer' },
    { nome: 'Quetiapina', principio: 'Quetiapina', concentracao: '25mg', forma: 'Comprimido', controlada: 'C1', receita: true, laboratorio: 'AstraZeneca' },
    
    // Antibióticos (Categoria 1)
    { nome: 'Amoxicilina', principio: 'Amoxicilina', concentracao: '500mg', forma: 'Cápsula', receita: true, laboratorio: 'EMS' },
    { nome: 'Azitromicina', principio: 'Azitromicina', concentracao: '500mg', forma: 'Comprimido', receita: true, laboratorio: 'Pfizer' },
    { nome: 'Ciprofloxacino', principio: 'Ciprofloxacino', concentracao: '500mg', forma: 'Comprimido', receita: true, laboratorio: 'Bayer' },
    { nome: 'Cefalexina', principio: 'Cefalexina', concentracao: '500mg', forma: 'Cápsula', receita: true, laboratorio: 'EMS' },
    { nome: 'Clindamicina', principio: 'Clindamicina', concentracao: '300mg', forma: 'Cápsula', receita: true, laboratorio: 'Pfizer' },
    
    // Analgésicos (Categoria 2)
    { nome: 'Paracetamol', principio: 'Paracetamol', concentracao: '500mg', forma: 'Comprimido', receita: false, laboratorio: 'EMS' },
    { nome: 'Dipirona', principio: 'Dipirona Sódica', concentracao: '500mg', forma: 'Comprimido', receita: false, laboratorio: 'Sanofi' },
    { nome: 'Aspirina', principio: 'Ácido Acetilsalicílico', concentracao: '500mg', forma: 'Comprimido', receita: false, laboratorio: 'Bayer' },
    { nome: 'Ibuprofeno', principio: 'Ibuprofeno', concentracao: '600mg', forma: 'Comprimido', receita: false, laboratorio: 'Pfizer' },
    { nome: 'Naproxeno', principio: 'Naproxeno', concentracao: '250mg', forma: 'Comprimido', receita: false, laboratorio: 'Bayer' },
    
    // Anti-inflamatórios (Categoria 3)
    { nome: 'Prednisolona', principio: 'Prednisolona', concentracao: '20mg', forma: 'Comprimido', receita: true, laboratorio: 'Pfizer' },
    { nome: 'Prednisona', principio: 'Prednisona', concentracao: '20mg', forma: 'Comprimido', receita: true, laboratorio: 'EMS' },
    { nome: 'Dexametasona', principio: 'Dexametasona', concentracao: '4mg', forma: 'Comprimido', receita: true, laboratorio: 'Aché' },
    
    // Vitaminas e Suplementos (Categoria 4)
    { nome: 'Vitamina C', principio: 'Ácido Ascórbico', concentracao: '500mg', forma: 'Comprimido', receita: false, laboratorio: 'Vitafor' },
    { nome: 'Vitamina D3', principio: 'Colecalciferol', concentracao: '2000UI', forma: 'Cápsula', receita: false, laboratorio: 'Vitafor' },
    { nome: 'Complexo B', principio: 'Complexo B', concentracao: '1mg', forma: 'Comprimido', receita: false, laboratorio: 'Centrum' },
    { nome: 'Ômega 3', principio: 'Ácidos Graxos Ômega 3', concentracao: '1000mg', forma: 'Cápsula', receita: false, laboratorio: 'Vitafor' },
    
    // Dermocosméticos (Categoria 5)
    { nome: 'Protetor Solar FPS 60', principio: 'Octocrileno', concentracao: '60FPS', forma: 'Creme', receita: false, laboratorio: 'La Roche-Posay' },
    { nome: 'Hidratante Facial', principio: 'Ácido Hialurônico', concentracao: '50ml', forma: 'Creme', receita: false, laboratorio: 'Vichy' },
    { nome: 'Antiacne Gel', principio: 'Peróxido de Benzoíla', concentracao: '5%', forma: 'Gel', receita: false, laboratorio: 'Episol' },
  ];

  const produtos = [];
  // Criar produtos base e suas variações
  for (let catIndex = 0; catIndex < categorias.length; catIndex++) {
    const categoria = categorias[catIndex];
    const produtosCategoria = produtosBase.filter((_, index) => {
      if (catIndex === 0) return index < 8; // Controlados
      if (catIndex === 1) return index >= 8 && index < 13; // Antibióticos
      if (catIndex === 2) return index >= 13 && index < 18; // Analgésicos
      if (catIndex === 3) return index >= 18 && index < 21; // Anti-inflamatórios
      if (catIndex === 4) return index >= 21 && index < 25; // Vitaminas
      if (catIndex === 5) return index >= 25; // Dermocosméticos
      return false;
    });

    // Criar produtos para esta categoria
    const targetCount = catIndex === 0 ? 25 : catIndex <= 3 ? 20 : 15; // Mais controlados e principais
    const produtosCategoriaExpanded = [];
    
    for (let i = 0; i < targetCount; i++) {
      const baseProduto = produtosCategoria[i % produtosCategoria.length];
      if (!baseProduto) continue;
      
      const isGeneric = i > produtosCategoria.length && Math.random() > 0.7;
      const variation = i > produtosCategoria.length ? ` - ${faker.helpers.arrayElement(['50mg', '100mg', '200mg', '20ml', '30ml', '60 cáps'])}` : '';
      const genericSuffix = isGeneric ? ' (Genérico)' : '';
      
      const prices = DataGenerator.generatePrice(
        catIndex === 0 ? 'controlados' :
        catIndex === 1 ? 'antibioticos' :
        catIndex === 2 ? 'analgesicos' :
        catIndex === 3 ? 'antiinflamatorios' :
        catIndex === 4 ? 'vitaminas' : 'dermocos',
        isGeneric
      );

      const produto = await prisma.produto.create({
        data: {
          nome: baseProduto.nome + variation + genericSuffix,
          descricao: `${baseProduto.forma} de ${baseProduto.principio} - ${baseProduto.laboratorio}`,
          codigoBarras: DataGenerator.generateEAN13(),
          classificacaoAnvisa: 'MEDICAMENTO',
          categoriaAnvisa: categoria.nome,
          exigeReceita: baseProduto.receita || false,
          tipoReceita: baseProduto.controlada ? baseProduto.controlada : (baseProduto.receita ? 'BRANCA' : null),
          classeControlada: baseProduto.controlada || null,
          retencaoReceita: ['A1', 'B1'].includes(baseProduto.controlada || '') || false,
          principioAtivo: baseProduto.principio,
          laboratorio: baseProduto.laboratorio,
          peso: faker.number.int({ min: 5, max: 500 }) / 1000, // gramas
          volume: baseProduto.forma.includes('Líquido') ? faker.number.int({ min: 10, max: 500 }) : null,
          dosagem: baseProduto.concentracao,
          formaFarmaceutica: baseProduto.forma,
          precoVenda: prices.venda,
          precoCusto: prices.custo,
          margem: prices.margem,
          estoque: faker.number.int({ min: 0, max: 200 }),
          estoqueMinimo: faker.number.int({ min: 5, max: 20 }),
          estoqueMaximo: faker.number.int({ min: 100, max: 300 }),
          categoriaId: categoria.id,
          ativo: true,
        },
      });
      produtos.push(produto);
      produtosCategoriaExpanded.push(produto);
    }
  }

  console.log(`✅ Segunda fase concluída: ${todosClientes.length} clientes (${clientesCPF.length} CPF + ${clientesCNPJ.length} CNPJ), ${produtos.length} produtos criados.`);

  // FASE 6: Criação de relacionamentos produto-fornecedor
  console.log('🔗 Criando relacionamentos produto-fornecedor...');
  for (const produto of produtos) {
    const fornecedorAleatorio = fornecedores[Math.floor(Math.random() * fornecedores.length)];
    await prisma.produtoFornecedor.create({
      data: {
        produtoId: produto.id,
        fornecedorId: fornecedorAleatorio.id,
        precoCusto: produto.precoCusto || 0,
        prazoEntrega: faker.number.int({ min: 5, max: 20 }), // 5-20 dias
        ativo: true,
      },
    });
  }

  // FASE 7: Criação de lotes para medicamentos controlados
  console.log('📦 Criando lotes para medicamentos controlados...');
  const medicamentosControlados = produtos.filter(p => p.exigeReceita && p.classeControlada);
  const lotes = [];
  
  for (const produto of medicamentosControlados) {
    const numLotes = faker.number.int({ min: 2, max: 4 }); // 2-4 lotes por controlado
    
    for (let i = 0; i < numLotes; i++) {
      const dataFabricacao = subDays(new Date(), faker.number.int({ min: 30, max: 180 }));
      const dataValidade = addDays(dataFabricacao, faker.number.int({ min: 730, max: 1825 })); // 2-5 anos
      
      const quantidadeInicial = faker.number.int({ min: 50, max: 200 });
      const quantidadeVendida = faker.number.int({ min: 0, max: Math.floor(quantidadeInicial * 0.3) });
      const quantidadeAtual = quantidadeInicial - quantidadeVendida;
      
      const numeroLote = `${produto.laboratorio?.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}${String.fromCharCode(65 + i)}`;
      
      const lote = await prisma.lote.create({
        data: {
          produtoId: produto.id,
          numeroLote,
          codigoBarrasLote: `${produto.codigoBarras}L${i + 1}`,
          dataFabricacao,
          dataValidade,
          quantidadeInicial,
          quantidadeAtual,
          quantidadeReservada: 0,
          precoCusto: produto.precoCusto || 0,
          fornecedorId: fornecedores[faker.number.int({ min: 0, max: fornecedores.length - 1 })].id,
          observacoes: `Lote ${i + 1} de ${produto.nome} - Classe ${produto.classeControlada}`,
          ativo: true,
        },
      });
      lotes.push(lote);
    }
  }

  // FASE 8: Criação de 500+ vendas com cenários diversos
  console.log('💰 Criando vendas diversas (500+ registros)...');
  const vendas = [];
  const formasPagamento = ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA'];
  const statusPagamento = ['PAGO', 'PENDENTE', 'CANCELADO'];
  
  for (let i = 0; i < 520; i++) {
    const cliente = todosClientes[faker.number.int({ min: 0, max: todosClientes.length - 1 })];
    const usuario = usuarios[faker.number.int({ min: 0, max: usuarios.length - 1 })];
    const formaPagamento = faker.helpers.arrayElement(formasPagamento);
    
    // 5% das vendas serão canceladas
    const isCancelada = i < 26; // Primeiras 26 vendas canceladas
    const status = isCancelada ? 'CANCELADO' : 
                  (faker.number.int({ min: 1, max: 100 }) <= 3 ? 'PENDENTE' : 'PAGO');
    
    // Selecionar produtos para a venda (1 a 5 itens)
    const numItens = faker.number.int({ min: 1, max: 5 });
    const produtosVenda = [];
    const produtosDisponiveis = produtos.filter(p => p.estoque > 0);
    
    let temMedicamentoControlado = false;
    let vendaAssistida = false;
    
    for (let j = 0; j < numItens; j++) {
      const produto = faker.helpers.arrayElement(produtosDisponiveis);
      const quantidade = faker.number.int({ min: 1, max: 3 });
      
      // Verificar se já foi adicionado
      const produtoExistente = produtosVenda.find(p => p.produtoId === produto.id);
      if (!produtoExistente && produto.estoque >= quantidade) {
        const desconto = faker.number.int({ min: 0, max: produto.precoVenda * 0.1 }); // Até 10% desconto
        const precoUnitario = Number(produto.precoVenda);
        const total = (precoUnitario - desconto) * quantidade;
        
        produtosVenda.push({
          produtoId: produto.id,
          quantidade,
          precoUnitario,
          desconto,
          total
        });
        
        // Verificar se é medicamento controlado
        if (produto.exigeReceita && produto.classeControlada) {
          temMedicamentoControlado = true;
          // Venda assistida se não é farmacêutico
          if (!usuario.tipo.includes('FARMACEUTICO') && !usuario.tipo.includes('ADMINISTRADOR') && !usuario.tipo.includes('GERENTE')) {
            vendaAssistida = true;
          }
        }
      }
    }
    
    if (produtosVenda.length === 0) continue;
    
    const valorTotal = produtosVenda.reduce((sum, item) => sum + item.total, 0);
    const valorDesconto = produtosVenda.reduce((sum, item) => sum + (item.desconto * item.quantidade), 0);
    const valorFinal = valorTotal - valorDesconto;
    
    // Dados de receita para medicamentos controlados
    let numeroReceita = null;
    let dataReceita = null;
    let pacienteNome = null;
    let pacienteDocumento = null;
    let pacienteRg = null;
    let observacoes = null;
    
    if (temMedicamentoControlado && status !== 'CANCELADO') {
      numeroReceita = `REC${String(i + 1).padStart(8, '0')}`;
      dataReceita = format(subDays(new Date(), faker.number.int({ min: 0, max: 7 })), 'yyyy-MM-dd');
      pacienteNome = faker.person.fullName();
      pacienteDocumento = DataGenerator.generateValidCPF();
      pacienteRg = faker.number.int({ min: 100000000, max: 999999999 }).toString();
      
      if (vendaAssistida) {
        observacoes = `Venda assistida - Justificativa: ${faker.helpers.arrayElement([
          'Paciente em tratamento contínuo, receita anterior válida',
          'Emergência médica, medicamento de uso crônico',
          'Tratamento prescrito por especialista, paciente conhecido',
          'Continuação de tratamento iniciado, acompanhamento médico'
        ])}`;
      }
    }
    
    // Data da venda (varia nos últimos 90 dias)
    const dataVenda = subDays(new Date(), faker.number.int({ min: 0, max: 90 }));
    
    const venda = await prisma.venda.create({
      data: {
        clienteId: cliente.id,
        usuarioId: usuario.id,
        clienteNome: cliente.nome,
        clienteDocumento: cliente.documento,
        clienteTipoDocumento: cliente.tipoDocumento,
        pacienteNome,
        pacienteDocumento,
        pacienteTipoDocumento: pacienteDocumento ? 'CPF' : null,
        pacienteRg,
        valorTotal,
        valorDesconto,
        valorFinal,
        formaPagamento,
        statusPagamento: status,
        temMedicamentoControlado,
        receitaArquivada: temMedicamentoControlado && status === 'PAGO',
        numeroReceita,
        dataReceita,
        observacoes,
        criadoEm: dataVenda,
        itens: {
          create: produtosVenda.map(item => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            desconto: item.desconto,
            total: item.total
          }))
        }
      },
      include: {
        itens: true
      }
    });
    
    vendas.push(venda);
    
    // Atualizar estoque apenas para vendas pagas
    if (status === 'PAGO') {
      for (const item of produtosVenda) {
        await prisma.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: {
              decrement: item.quantidade
            }
          }
        });
        
        // Criar movimentação de estoque
        await prisma.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'SAIDA',
            quantidade: item.quantidade,
            motivo: `Venda #${venda.id.substring(0, 8)}`,
            usuarioId: usuario.id
          }
        });
      }
    }
  }
  
  // FASE 9: Criação de promoções
  console.log('🏷️ Criando promoções...');
  const promocoes = [];
  const produtosParaPromocao = faker.helpers.arrayElements(produtos, 15);
  
  for (const produto of produtosParaPromocao) {
    const dataInicio = subDays(new Date(), faker.number.int({ min: 0, max: 30 }));
    const dataFim = addDays(dataInicio, faker.number.int({ min: 15, max: 60 }));
    
    const tipo = faker.helpers.arrayElement(['FIXO', 'PORCENTAGEM']);
    const precoOriginal = Number(produto.precoVenda);
    
    let valorDesconto = null;
    let porcentagemDesconto = null;
    let precoPromocional = precoOriginal;
    
    if (tipo === 'FIXO') {
      valorDesconto = faker.number.int({ min: 1, max: precoOriginal * 0.4 });
      precoPromocional = precoOriginal - valorDesconto;
    } else {
      porcentagemDesconto = faker.number.int({ min: 10, max: 40 });
      precoPromocional = precoOriginal * (1 - porcentagemDesconto / 100);
    }
    
    const condicaoTermino = faker.helpers.arrayElement(['ATE_ACABAR_ESTOQUE', 'QUANTIDADE_LIMITADA']);
    const quantidadeMaxima = condicaoTermino === 'QUANTIDADE_LIMITADA' ? 
      faker.number.int({ min: 10, max: 100 }) : null;
    
    const promocao = await prisma.promocao.create({
      data: {
        nome: `Oferta: ${produto.nome}`,
        descricao: `Promoção especial em ${produto.nome} - Aproveite!`,
        produtoId: produto.id,
        tipo,
        valorDesconto,
        porcentagemDesconto,
        precoPromocional: Number(precoPromocional.toFixed(2)),
        condicaoTermino,
        quantidadeMaxima,
        quantidadeVendida: faker.number.int({ min: 0, max: quantidadeMaxima || 20 }),
        dataInicio,
        dataFim,
        ativo: dataFim > new Date()
      }
    });
    promocoes.push(promocao);
  }

  // Estatísticas finais
  const produtosAtualizados = await prisma.produto.findMany();
  const produtosComEstoqueZero = produtosAtualizados.filter(p => p.estoque === 0).length;
  const produtosComEstoque = produtosAtualizados.filter(p => p.estoque > 0).length;
  const vendasPagas = vendas.filter(v => v.statusPagamento === 'PAGO').length;
  const vendasCanceladas = vendas.filter(v => v.statusPagamento === 'CANCELADO').length;
  const vendasComControlados = vendas.filter(v => v.temMedicamentoControlado).length;
  
  console.log('\n✅ Seed completo concluído com sucesso!');
  console.log('📆 Estatísticas finais:');
  console.log(`   • ${usuarios.length} usuários (todos os níveis hierárquicos)`);
  console.log(`   • ${categorias.length} categorias de produtos`);
  console.log(`   • ${fornecedores.length} fornecedores farmacêuticos`);
  console.log(`   • ${produtos.length} produtos com dados completos`);
  console.log(`   • ${todosClientes.length} clientes (${clientesCPF.length} CPF com crédito 0 + ${clientesCNPJ.length} CNPJ com crédito 100-1500)`);
  console.log(`   • ${vendas.length} vendas (${vendasPagas} pagas, ${vendasCanceladas} canceladas, ${vendas.length - vendasPagas - vendasCanceladas} pendentes)`);
  console.log(`   • ${vendasComControlados} vendas com medicamentos controlados`);
  console.log(`   • ${lotes.length} lotes de medicamentos controlados`);
  console.log(`   • ${promocoes.length} promoções ativas e expiradas`);
  console.log(`   • ${produtosComEstoque} produtos com estoque / ${produtosComEstoqueZero} sem estoque`);
  console.log(`\n🎆 Base de dados robusta criada para testes completos!`);
  console.log('🔍 Sistema pronto para auditoria, compliance e todos os cenários de teste.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });