/*
  Warnings:

  - You are about to drop the `produto_promocao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promocoes` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('RASCUNHO', 'ENVIADO', 'CONFIRMADO', 'PARCIALMENTE_RECEBIDO', 'RECEBIDO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusRecebimento" AS ENUM ('AGUARDANDO_CONFERENCIA', 'EM_CONFERENCIA', 'CONFERIDO', 'APROVADO', 'REJEITADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "StatusConferencia" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONFERIDO', 'COM_DIVERGENCIA', 'APROVADO', 'REJEITADO');

-- DropForeignKey
ALTER TABLE "produto_promocao" DROP CONSTRAINT "produto_promocao_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "produto_promocao" DROP CONSTRAINT "produto_promocao_promocao_id_fkey";

-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "tipo_documento" SET DATA TYPE VARCHAR(12);

-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "data_receita" VARCHAR(20),
ADD COLUMN     "paciente_documento" VARCHAR(18),
ADD COLUMN     "paciente_endereco" TEXT,
ADD COLUMN     "paciente_nome" VARCHAR(100),
ADD COLUMN     "paciente_rg" VARCHAR(20),
ADD COLUMN     "paciente_tipo_documento" VARCHAR(4);

-- DropTable
DROP TABLE "produto_promocao";

-- DropTable
DROP TABLE "promocoes";

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "numero_lote" VARCHAR(50) NOT NULL,
    "codigo_barras_lote" VARCHAR(50),
    "data_fabricacao" TIMESTAMP(3) NOT NULL,
    "data_validade" TIMESTAMP(3) NOT NULL,
    "quantidade_inicial" INTEGER NOT NULL,
    "quantidade_atual" INTEGER NOT NULL,
    "quantidade_reservada" INTEGER NOT NULL DEFAULT 0,
    "preco_custo" DECIMAL(10,2) NOT NULL,
    "fornecedor_id" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_lote" (
    "id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "venda_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_venda_lote" (
    "id" TEXT NOT NULL,
    "item_venda_id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "item_venda_lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numero_pedido" VARCHAR(20) NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "data_emissao" TIMESTAMP(3) NOT NULL,
    "data_previsao_entrega" TIMESTAMP(3),
    "observacoes" TEXT,
    "status" "StatusPedido" NOT NULL DEFAULT 'RASCUNHO',
    "valor_total" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "quantidade_recebida" INTEGER NOT NULL DEFAULT 0,
    "quantidade_pendente" INTEGER NOT NULL,
    "nome_produto" VARCHAR(200) NOT NULL,
    "codigo_barras" VARCHAR(50),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "numero_nota_fiscal" VARCHAR(50) NOT NULL,
    "data_emissao_nf" TIMESTAMP(3) NOT NULL,
    "valor_total_nf" DECIMAL(10,2) NOT NULL,
    "data_recebimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusRecebimento" NOT NULL DEFAULT 'AGUARDANDO_CONFERENCIA',
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_recebimento" (
    "id" TEXT NOT NULL,
    "recebimento_id" TEXT NOT NULL,
    "item_pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade_pedida" INTEGER NOT NULL,
    "quantidade_recebida" INTEGER NOT NULL,
    "quantidade_conferida" INTEGER NOT NULL DEFAULT 0,
    "quantidade_aprovada" INTEGER NOT NULL DEFAULT 0,
    "lote" VARCHAR(50),
    "data_vencimento" TIMESTAMP(3),
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "status_conferencia" "StatusConferencia" NOT NULL DEFAULT 'PENDENTE',
    "divergencias" JSON,
    "nome_produto" VARCHAR(200) NOT NULL,
    "codigo_barras" VARCHAR(50),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_recebimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conferencias_mercadoria" (
    "id" TEXT NOT NULL,
    "recebimento_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "data_conferencia" TIMESTAMP(3) NOT NULL,
    "status" "StatusConferencia" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "divergencias_encontradas" JSON,
    "aprovado_por" TEXT,
    "data_aprovacao" TIMESTAMP(3),
    "motivo_rejeicao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conferencias_mercadoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotes_produto_id_numero_lote_key" ON "lotes"("produto_id", "numero_lote");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_pedido_key" ON "pedidos"("numero_pedido");

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_lote" ADD CONSTRAINT "movimentacao_lote_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_lote" ADD CONSTRAINT "movimentacao_lote_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_lote" ADD CONSTRAINT "movimentacao_lote_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_venda_lote" ADD CONSTRAINT "item_venda_lote_item_venda_id_fkey" FOREIGN KEY ("item_venda_id") REFERENCES "item_venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_venda_lote" ADD CONSTRAINT "item_venda_lote_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_recebimento" ADD CONSTRAINT "itens_recebimento_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_recebimento" ADD CONSTRAINT "itens_recebimento_item_pedido_id_fkey" FOREIGN KEY ("item_pedido_id") REFERENCES "itens_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_recebimento" ADD CONSTRAINT "itens_recebimento_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencias_mercadoria" ADD CONSTRAINT "conferencias_mercadoria_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencias_mercadoria" ADD CONSTRAINT "conferencias_mercadoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferencias_mercadoria" ADD CONSTRAINT "conferencias_mercadoria_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
