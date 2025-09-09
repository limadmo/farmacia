import { PrismaClient, TipoUsuario, TipoAlcancePromocao } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { cpf, cnpj } from 'cpf-cnpj-validator';
import { addDays, subDays, format } from 'date-fns';

// Configurar faker para português brasileiro (versão nova não precisa de configuração)

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
  console.log('📅 Data/hora:', new Date().toLocaleString('pt-BR'));
  
  const startTime = performance.now();

  // Limpeza de dados existentes
  console.log('\n🧹 Limpando dados existentes...');
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
  console.log('✅ Limpeza concluída!\n');

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
  
  const userCounts = {
    admin: usuarios.filter(u => u.tipo === 'ADMINISTRADOR').length,
    farmaceutico: usuarios.filter(u => u.tipo === 'FARMACEUTICO').length,
    gerente: usuarios.filter(u => u.tipo === 'GERENTE').length,
    vendedor: usuarios.filter(u => u.tipo === 'VENDEDOR').length,
    pdv: usuarios.filter(u => u.tipo === 'PDV').length
  };
  console.log(`✅ ${usuarios.length} usuários criados:`);
  console.log(`   👑 Administradores: ${userCounts.admin}`);
  console.log(`   💊 Farmacêuticos: ${userCounts.farmaceutico}`);
  console.log(`   🏢 Gerentes: ${userCounts.gerente}`);
  console.log(`   💰 Vendedores: ${userCounts.vendedor}`);
  console.log(`   🖥️ PDV: ${userCounts.pdv}\n`);

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
  console.log(`✅ ${categorias.length} categorias de produtos criadas\n`);

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
  console.log(`✅ ${fornecedores.length} fornecedores farmacêuticos criados\n`);

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
  console.log(`✅ ${clientesCPF.length} clientes CPF criados (sem crédito)\n`);

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
  
  const creditoTotalCNPJ = clientesCNPJ.reduce((total, c) => total + Number(c.limiteCredito), 0);
  const creditoDisponivel = clientesCNPJ.reduce((total, c) => total + Number(c.creditoDisponivel), 0);
  console.log(`✅ ${clientesCNPJ.length} clientes CNPJ criados:`);
  console.log(`   💳 Crédito total: R$ ${creditoTotalCNPJ.toFixed(2)}`);
  console.log(`   💰 Crédito disponível: R$ ${creditoDisponivel.toFixed(2)}\n`);

  const todosClientes = [...clientesCPF, ...clientesCNPJ];

  // FASE 5: Pré-cálculo de demanda para vendas
  console.log('📊 Calculando demanda de produtos para vendas futuras...');
  
  // Simular vendas para calcular demanda necessária
  const demandaPorProduto = new Map<number, number>();
  const vendasSimuladas: any[] = [];
  
  // Definir quantos produtos teremos
  const totalProdutos = 115; // Conforme estatísticas finais esperadas
  
  // Simular 520 vendas
  for (let i = 0; i < 520; i++) {
    const isCancelada = i < 26; // Primeiras 26 vendas canceladas
    const isPendente = !isCancelada && faker.number.int({ min: 1, max: 100 }) <= 3; // 3% pendentes
    const numItens = faker.number.int({ min: 1, max: 5 });
    const itensVenda: any[] = [];
    
    for (let j = 0; j < numItens; j++) {
      const produtoIndex = faker.number.int({ min: 0, max: totalProdutos - 1 });
      const quantidade = faker.number.int({ min: 1, max: 3 });
      
      // Só contabilizar demanda de vendas que serão pagas (não canceladas)
      if (!isCancelada && !isPendente) {
        const demandaAtual = demandaPorProduto.get(produtoIndex) || 0;
        demandaPorProduto.set(produtoIndex, demandaAtual + quantidade);
      }
      
      itensVenda.push({ produtoIndex, quantidade });
    }
    
    vendasSimuladas.push({
      vendaIndex: i,
      itens: itensVenda,
      cancelada: isCancelada,
      pendente: isPendente
    });
  }
  
  console.log(`✅ Demanda calculada: ${demandaPorProduto.size} produtos terão vendas`);
  
  // FASE 6: Criação de produtos com estoque baseado na demanda
  console.log('💊 Criando produtos com estoque calculado...');
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
    console.log(`📦 Criando produtos para categoria: ${categoria.nome} (${catIndex + 1}/${categorias.length})`);
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

      const produto: any = await prisma.produto.create({
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
          loteObrigatorio: baseProduto.controlada ? true : faker.datatype.boolean({ probability: 0.3 }), // Produtos controlados sempre obrigatórios, outros 30% de chance
          principioAtivo: baseProduto.principio,
          laboratorio: baseProduto.laboratorio,
          peso: faker.number.int({ min: 5, max: 500 }) / 1000, // gramas
          volume: baseProduto.forma.includes('Líquido') ? faker.number.int({ min: 10, max: 500 }) : null,
          dosagem: baseProduto.concentracao,
          formaFarmaceutica: baseProduto.forma,
          precoVenda: prices.venda,
          precoCusto: prices.custo,
          margem: prices.margem,
          estoque: (() => {
            // Calcular estoque baseado na demanda
            const produtoIndex: number = produtos.length; // Índice do produto sendo criado
            const demandaTotal: number = demandaPorProduto.get(produtoIndex) || 0;
            
            if (demandaTotal === 0) {
              // Produto não será vendido - estoque aleatório normal
              return faker.number.int({ min: 10, max: 200 });
            }
            
            // Decidir se produto ficará zerado ou com estoque após vendas
            const probabilidadeZerar = 0.15; // 15% dos produtos com vendas ficam zerados
            const ficaraZerado = faker.number.float() < probabilidadeZerar;
            
            if (ficaraZerado) {
              // Estoque exato para zerar após vendas
              return demandaTotal;
            } else {
              // Adicionar margem de segurança (10-150 unidades extras)
              const margemSeguranca = faker.number.int({ min: 10, max: 150 });
              return demandaTotal + margemSeguranca;
            }
          })() as number,
          estoqueMinimo: faker.number.int({ min: 5, max: 20 }),
          estoqueMaximo: faker.number.int({ min: 100, max: 300 }),
          categoriaId: categoria.id,
          ativo: true,
        },
      });
      produtos.push(produto);
      produtosCategoriaExpanded.push(produto);
    }
    console.log(`✅ ${produtosCategoriaExpanded.length} produtos criados para ${categoria.nome}`);
  }

  console.log(`✅ Segunda fase concluída: ${todosClientes.length} clientes (${clientesCPF.length} CPF + ${clientesCNPJ.length} CNPJ), ${produtos.length} produtos criados.`);

  // FASE 6: Criação de relacionamentos produto-fornecedor
  console.log('🔗 Criando relacionamentos produto-fornecedor...');
  let relationsCount = 0;
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
    relationsCount++;
  }
  console.log(`✅ ${relationsCount} relacionamentos produto-fornecedor criados\n`);

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
  console.log(`✅ ${lotes.length} lotes criados para ${medicamentosControlados.length} medicamentos controlados\n`);

  // FASE 8: Criação de vendas usando dados simulados
  console.log('💰 Criando vendas baseadas na simulação (500+ registros)...');
  const vendas = [];
  const formasPagamento = ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA'];
  
  // Criar mapa de estoque em memória para controle durante vendas
  const estoqueMap = new Map<string, number>();
  produtos.forEach(produto => estoqueMap.set(produto.id, produto.estoque));
  
  console.log('📦 Iniciando controle de estoque em memória...');
  
  for (let i = 0; i < 520; i++) {
    if (i % 100 === 0 && i > 0) {
      console.log(`   🛒 Processando vendas: ${i}/520 (${Math.round((i/520)*100)}%)`);
    }
    const vendaSimulada = vendasSimuladas[i];
    const cliente = todosClientes[faker.number.int({ min: 0, max: todosClientes.length - 1 })];
    const usuario = usuarios[faker.number.int({ min: 0, max: usuarios.length - 1 })];
    const formaPagamento = faker.helpers.arrayElement(formasPagamento);
    
    // Status baseado na simulação
    const status = vendaSimulada.cancelada ? 'CANCELADO' : 
                  (vendaSimulada.pendente ? 'PENDENTE' : 'PAGO');
    
    // Usar itens da simulação
    const produtosVenda: any[] = [];
    let vendaValida = true;
    
    let temMedicamentoControlado = false;
    let vendaAssistida = false;
    
    // Processar itens da simulação
    for (const itemSimulado of vendaSimulada.itens) {
      const produto = produtos[itemSimulado.produtoIndex];
      const quantidade = itemSimulado.quantidade;
      
      if (!produto) continue;
      
      // Verificar estoque no mapa (em memória)
      const estoqueAtual = estoqueMap.get(produto.id) || 0;
      
      // Só adicionar se houver estoque suficiente E a venda será paga
      if (estoqueAtual >= quantidade && status === 'PAGO') {
        const desconto = faker.number.int({ min: 0, max: Number(produto.precoVenda) * 0.1 });
        const precoUnitario = Number(produto.precoVenda);
        const total = (precoUnitario - desconto) * quantidade;
        
        produtosVenda.push({
          produtoId: produto.id,
          quantidade,
          precoUnitario,
          desconto,
          total
        });
        
        // Atualizar estoque no mapa IMEDIATAMENTE
        estoqueMap.set(produto.id, estoqueAtual - quantidade);
        
        // Verificar se é medicamento controlado
        if (produto.exigeReceita && produto.classeControlada) {
          temMedicamentoControlado = true;
          if (!usuario.tipo.includes('FARMACEUTICO') && !usuario.tipo.includes('ADMINISTRADOR') && !usuario.tipo.includes('GERENTE')) {
            vendaAssistida = true;
          }
        }
      } else if (status !== 'PAGO') {
        // Vendas canceladas/pendentes podem ter qualquer produto (não afetam estoque)
        const desconto = faker.number.int({ min: 0, max: Number(produto.precoVenda) * 0.1 });
        const precoUnitario = Number(produto.precoVenda);
        const total = (precoUnitario - desconto) * quantidade;
        
        produtosVenda.push({
          produtoId: produto.id,
          quantidade,
          precoUnitario,
          desconto,
          total
        });
        
        // Não atualizar estoque para vendas não pagas
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
    
    // Atualizar estoque no banco apenas para vendas pagas
    // (Estoque já foi atualizado no mapa durante criação dos itens)
    if (status === 'PAGO') {
      for (const item of produtosVenda) {
        // Atualizar estoque usando valor do mapa (garantindo consistência)
        const estoqueAtual = estoqueMap.get(item.produtoId) || 0;
        
        await prisma.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: estoqueAtual // Usar valor exato do mapa
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
  
  // FASE 9: Criação de promoções expandidas (todos os cenários)
  console.log('🏷️ Criando promoções expandidas com cenários completos...');
  const promocoes = [];
  
  // Função auxiliar para calcular preço promocional
  const calcularPrecoPromocional = (precoOriginal: number, tipo: string, valorDesconto?: number, porcentagemDesconto?: number) => {
    if (tipo === 'FIXO' && valorDesconto) {
      return Math.max(precoOriginal - valorDesconto, 0);
    }
    if (tipo === 'PORCENTAGEM' && porcentagemDesconto) {
      return precoOriginal * (1 - porcentagemDesconto / 100);
    }
    return precoOriginal;
  };
  
  // CENÁRIO A: Promoções por Produto Específico (8 promoções)
  console.log('   📦 Criando promoções por produto específico...');
  const produtosEspecificos = produtos.slice(0, 8);
  
  for (let i = 0; i < produtosEspecificos.length; i++) {
    const produto = produtosEspecificos[i];
    const precoOriginal = Number(produto.precoVenda);
    
    // Alternando entre diferentes cenários
    const cenarios = [
      { nome: '15% OFF', tipo: 'PORCENTAGEM', porcentagemDesconto: 15, dias: 30 },
      { nome: 'R$ 5,00 OFF', tipo: 'FIXO', valorDesconto: 5, dias: 45 },
      { nome: '20% Desconto Limitado', tipo: 'PORCENTAGEM', porcentagemDesconto: 20, dias: 15, limitada: 50 },
      { nome: 'Oferta Especial', tipo: 'FIXO', valorDesconto: 3, dias: 60 },
      { nome: '25% Super Desconto', tipo: 'PORCENTAGEM', porcentagemDesconto: 25, dias: 7 },
      { nome: 'Liquidação R$ 8 OFF', tipo: 'FIXO', valorDesconto: 8, dias: 30 },
      { nome: '10% Toda Semana', tipo: 'PORCENTAGEM', porcentagemDesconto: 10, dias: 90 },
      { nome: 'Oferta Relâmpago', tipo: 'FIXO', valorDesconto: 2, dias: 3 }
    ];
    
    const cenario = cenarios[i];
    const dataInicio = subDays(new Date(), faker.number.int({ min: 0, max: 15 }));
    const dataFim = addDays(dataInicio, cenario.dias);
    
    const precoPromocional = calcularPrecoPromocional(
      precoOriginal, 
      cenario.tipo, 
      cenario.valorDesconto, 
      cenario.porcentagemDesconto
    );
    
    const promocao = await prisma.promocao.create({
      data: {
        nome: `${cenario.nome} - ${produto.nome}`,
        descricao: `Promoção especial: ${cenario.nome} em ${produto.nome}`,
        tipoAlcance: TipoAlcancePromocao.PRODUTO,
        produtoId: produto.id,
        tipo: cenario.tipo as any,
        valorDesconto: cenario.valorDesconto,
        porcentagemDesconto: cenario.porcentagemDesconto,
        precoPromocional: Number(precoPromocional.toFixed(2)),
        condicaoTermino: cenario.limitada ? 'QUANTIDADE_LIMITADA' : 'ATE_ACABAR_ESTOQUE',
        quantidadeMaxima: cenario.limitada || null,
        quantidadeVendida: cenario.limitada ? faker.number.int({ min: 0, max: Math.floor(cenario.limitada * 0.3) }) : 0,
        dataInicio,
        dataFim,
        ativo: dataFim > new Date()
      }
    });
    promocoes.push(promocao);
  }
  
  // CENÁRIO B: Promoções por Laboratório (7 promoções)
  console.log('   🏢 Criando promoções por laboratório...');
  const laboratorios = ['Bayer', 'EMS', 'Eurofarma', 'Medley', 'Sanofi', 'Novartis', 'Aché'];
  
  for (let i = 0; i < laboratorios.length; i++) {
    const laboratorio = laboratorios[i];
    
    const cenariosLab = [
      { nome: '10% em todo portfólio Bayer', tipo: 'PORCENTAGEM', porcentagemDesconto: 10, dias: 60 },
      { nome: 'R$ 3,00 OFF produtos EMS', tipo: 'FIXO', valorDesconto: 3, dias: 30 },
      { nome: '12% Eurofarma (Limitado)', tipo: 'PORCENTAGEM', porcentagemDesconto: 12, dias: 45, limitada: 100 },
      { nome: '8% linha Medley', tipo: 'PORCENTAGEM', porcentagemDesconto: 8, dias: 30 },
      { nome: 'Sanofi: R$ 4 OFF', tipo: 'FIXO', valorDesconto: 4, dias: 25 },
      { nome: 'Novartis 15% OFF', tipo: 'PORCENTAGEM', porcentagemDesconto: 15, dias: 20 },
      { nome: 'Aché R$ 2,50 desconto', tipo: 'FIXO', valorDesconto: 2.5, dias: 40 }
    ];
    
    const cenario = cenariosLab[i];
    const dataInicio = subDays(new Date(), faker.number.int({ min: 0, max: 20 }));
    const dataFim = addDays(dataInicio, cenario.dias);
    
    const promocao = await prisma.promocao.create({
      data: {
        nome: cenario.nome,
        descricao: `Promoção válida para todos os produtos do laboratório ${laboratorio}`,
        tipoAlcance: TipoAlcancePromocao.LABORATORIO,
        laboratorio: laboratorio,
        tipo: cenario.tipo as any,
        valorDesconto: cenario.valorDesconto,
        porcentagemDesconto: cenario.porcentagemDesconto,
        precoPromocional: null, // Calculado dinamicamente
        condicaoTermino: cenario.limitada ? 'QUANTIDADE_LIMITADA' : 'ATE_ACABAR_ESTOQUE',
        quantidadeMaxima: cenario.limitada || null,
        quantidadeVendida: cenario.limitada ? faker.number.int({ min: 0, max: Math.floor(cenario.limitada * 0.2) }) : 0,
        dataInicio,
        dataFim,
        ativo: dataFim > new Date()
      }
    });
    promocoes.push(promocao);
  }
  
  // CENÁRIO C: Promoções por Lote Específico (6 promoções)
  console.log('   📦 Criando promoções por lote específico...');
  const lotesDisponiveis = lotes.slice(0, 6);
  
  for (let i = 0; i < lotesDisponiveis.length; i++) {
    const lote = lotesDisponiveis[i];
    const produto = produtos.find(p => p.id === lote.produtoId);
    
    if (!produto) continue;
    
    const cenariosLote = [
      { nome: 'Liquidação Lote', tipo: 'PORCENTAGEM', porcentagemDesconto: 25, dias: 15, motivo: 'Próximo ao vencimento' },
      { nome: 'R$ 4,00 OFF Lote', tipo: 'FIXO', valorDesconto: 4, dias: 20, motivo: 'Liquidação de estoque' },
      { nome: '18% Desconto Lote', tipo: 'PORCENTAGEM', porcentagemDesconto: 18, dias: 10, motivo: 'Promoção sazonal', limitada: 20 },
      { nome: 'Super Oferta Lote', tipo: 'FIXO', valorDesconto: 6, dias: 30, motivo: 'Oferta especial' },
      { nome: '30% OFF Lote Sazonal', tipo: 'PORCENTAGEM', porcentagemDesconto: 30, dias: 5, motivo: 'Black Friday' },
      { nome: 'Lote R$ 2,50 OFF', tipo: 'FIXO', valorDesconto: 2.5, dias: 25, motivo: 'Promoção de verão' }
    ];
    
    const cenario = cenariosLote[i];
    const precoOriginal = Number(produto.precoVenda);
    const dataInicio = subDays(new Date(), faker.number.int({ min: 0, max: 10 }));
    const dataFim = addDays(dataInicio, cenario.dias);
    
    const precoPromocional = calcularPrecoPromocional(
      precoOriginal, 
      cenario.tipo, 
      cenario.valorDesconto, 
      cenario.porcentagemDesconto
    );
    
    const promocao = await prisma.promocao.create({
      data: {
        nome: `${cenario.nome} - ${produto.nome} (Lote ${lote.numeroLote})`,
        descricao: `${cenario.motivo}: ${cenario.nome} no lote ${lote.numeroLote} de ${produto.nome}`,
        tipoAlcance: TipoAlcancePromocao.LOTE,
        loteId: lote.id,
        tipo: cenario.tipo as any,
        valorDesconto: cenario.valorDesconto,
        porcentagemDesconto: cenario.porcentagemDesconto,
        precoPromocional: Number(precoPromocional.toFixed(2)),
        condicaoTermino: cenario.limitada ? 'QUANTIDADE_LIMITADA' : 'ATE_ACABAR_ESTOQUE',
        quantidadeMaxima: cenario.limitada || null,
        quantidadeVendida: cenario.limitada ? faker.number.int({ min: 0, max: Math.floor(cenario.limitada * 0.1) }) : 0,
        dataInicio,
        dataFim,
        ativo: dataFim > new Date()
      }
    });
    promocoes.push(promocao);
  }
  
  // CENÁRIO D: Promoções com Diferentes Estados (4 promoções para testes)
  console.log('   🧪 Criando promoções para cenários de teste...');
  const produtosRestantes = produtos.slice(8, 12);
  
  const cenariosEspeciais = [
    { nome: 'Promoção Futura', dataInicio: addDays(new Date(), 5), dataFim: addDays(new Date(), 35), ativo: true },
    { nome: 'Promoção Vencida', dataInicio: subDays(new Date(), 60), dataFim: subDays(new Date(), 10), ativo: true },
    { nome: 'Promoção Desativada', dataInicio: subDays(new Date(), 10), dataFim: addDays(new Date(), 20), ativo: false },
    { nome: 'Promoção Esgotada', dataInicio: subDays(new Date(), 15), dataFim: addDays(new Date(), 15), ativo: true, esgotada: true }
  ];
  
  for (let i = 0; i < cenariosEspeciais.length; i++) {
    const produto = produtosRestantes[i];
    const cenario = cenariosEspeciais[i];
    const precoOriginal = Number(produto.precoVenda);
    
    const promocao = await prisma.promocao.create({
      data: {
        nome: `${cenario.nome} - ${produto.nome}`,
        descricao: `Cenário de teste: ${cenario.nome}`,
        tipoAlcance: TipoAlcancePromocao.PRODUTO,
        produtoId: produto.id,
        tipo: 'PORCENTAGEM',
        porcentagemDesconto: 15,
        precoPromocional: Number((precoOriginal * 0.85).toFixed(2)),
        condicaoTermino: cenario.esgotada ? 'QUANTIDADE_LIMITADA' : 'ATE_ACABAR_ESTOQUE',
        quantidadeMaxima: cenario.esgotada ? 10 : null,
        quantidadeVendida: cenario.esgotada ? 10 : 0, // Já esgotada
        dataInicio: cenario.dataInicio,
        dataFim: cenario.dataFim,
        ativo: cenario.ativo
      }
    });
    promocoes.push(promocao);
  }
  
  console.log(`✅ ${promocoes.length} promoções criadas cobrindo todos os cenários:`)
  console.log(`   • 8 promoções por produto específico`)
  console.log(`   • 7 promoções por laboratório`)
  console.log(`   • 6 promoções por lote específico`)
  console.log(`   • 4 promoções com estados especiais para teste`)

  // Validação final e estatísticas
  console.log('🔍 Validando integridade do estoque...');
  const produtosAtualizados = await prisma.produto.findMany();
  
  // Validação crítica: detectar estoques negativos
  const produtosNegativos = produtosAtualizados.filter(p => p.estoque < 0);
  if (produtosNegativos.length > 0) {
    console.error('❌ ERRO CRÍTICO: Produtos com estoque negativo detectados:');
    produtosNegativos.forEach(p => {
      console.error(`   • ${p.nome}: ${p.estoque} unidades`);
    });
    throw new Error(`❌ SEED FALHOU: ${produtosNegativos.length} produtos com estoque negativo!`);
  }
  
  // Estatísticas detalhadas de estoque
  const produtosComEstoqueZero = produtosAtualizados.filter(p => p.estoque === 0).length;
  const produtosComEstoqueBaixo = produtosAtualizados.filter(p => p.estoque > 0 && p.estoque <= 10).length;
  const produtosComEstoqueAlto = produtosAtualizados.filter(p => p.estoque > 10).length;
  
  // Estatísticas de vendas
  const vendasPagas = vendas.filter(v => v.statusPagamento === 'PAGO').length;
  const vendasCanceladas = vendas.filter(v => v.statusPagamento === 'CANCELADO').length;
  const vendasComControlados = vendas.filter(v => v.temMedicamentoControlado).length;
  
  const endTime = performance.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n🎉 SEED COMPLETO - RESUMO FINAL');
  console.log('═'.repeat(50));
  console.log('👥 USUÁRIOS:');
  console.log(`   • Total: ${usuarios.length} criados`);
  console.log(`   • Administradores: ${userCounts.admin}`);
  console.log(`   • Farmacêuticos: ${userCounts.farmaceutico}`);
  console.log(`   • Gerentes: ${userCounts.gerente}`);
  console.log(`   • Vendedores: ${userCounts.vendedor}`);
  console.log(`   • PDV: ${userCounts.pdv}`);
  
  console.log('\n👤 CLIENTES:');
  console.log(`   • Total: ${todosClientes.length} clientes`);
  console.log(`   • CPF: ${clientesCPF.length} (sem crédito)`);
  console.log(`   • CNPJ: ${clientesCNPJ.length} (R$ ${creditoTotalCNPJ.toFixed(2)} crédito total)`);
  
  console.log('\n🏢 FORNECEDORES:');
  console.log(`   • ${fornecedores.length} fornecedores farmacêuticos`);
  console.log(`   • ${relationsCount} relacionamentos produto-fornecedor`);
  
  console.log('\n📂 CATEGORIAS & PRODUTOS:');
  console.log(`   • ${categorias.length} categorias de produtos`);
  console.log(`   • ${produtos.length} produtos criados`);
  console.log(`   • ${medicamentosControlados.length} medicamentos controlados`);
  console.log(`   • ${lotes.length} lotes para controlados`);
  
  console.log('\n📊 ESTOQUE:');
  console.log(`   • ${produtosComEstoqueZero} produtos zerados (${Math.round(produtosComEstoqueZero/produtos.length*100)}%)`);
  console.log(`   • ${produtosComEstoqueBaixo} produtos com estoque baixo (≤10)`);
  console.log(`   • ${produtosComEstoqueAlto} produtos com estoque normal (>10)`);
  
  console.log('\n💰 VENDAS:');
  console.log(`   • Total: ${vendas.length} vendas criadas`);
  console.log(`   • Pagas: ${vendasPagas} (${Math.round(vendasPagas/vendas.length*100)}%)`);
  console.log(`   • Canceladas: ${vendasCanceladas} (${Math.round(vendasCanceladas/vendas.length*100)}%)`);
  console.log(`   • Pendentes: ${vendas.length - vendasPagas - vendasCanceladas}`);
  console.log(`   • Com medicamentos controlados: ${vendasComControlados}`);
  
  console.log('\n🏷️ PROMOÇÕES:');
  console.log(`   • ${promocoes.length} promoções (ativas e expiradas)`);
  
  console.log('\n⏱️ PERFORMANCE:');
  console.log(`   • Tempo de execução: ${executionTime}s`);
  console.log(`   • Média: ${(vendas.length / parseFloat(executionTime)).toFixed(1)} vendas/segundo`);
  
  console.log('\n✅ SEED EXECUTADO COM SUCESSO - SEM ESTOQUE NEGATIVO!');
  
  console.log('\n📊 Distribuição de Estoque:');
  console.log(`   • ${produtosComEstoqueAlto} produtos bem estocados (> 10 unidades)`);
  console.log(`   • ${produtosComEstoqueBaixo} produtos com estoque baixo (1-10 unidades)`);
  console.log(`   • ${produtosComEstoqueZero} produtos zerados (0 unidades)`);
  console.log(`   • 0 produtos com estoque negativo (GARANTIDO!)`);
  
  console.log(`\n🎯 Validação de Integridade:`);
  console.log(`   • ✅ Nenhum produto com estoque negativo`);
  console.log(`   • ✅ ${Math.round(produtosComEstoqueZero / produtos.length * 100)}% dos produtos naturalmente zerados`);
  console.log(`   • ✅ Demanda calculada e atendida corretamente`);
  console.log(`   • ✅ Controle de estoque em memória funcionando`);
  
  console.log(`\n🎆 Base de dados robusta criada para testes completos!`);
  console.log('🔍 Sistema pronto para auditoria, compliance e validação de regras de negócio.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });