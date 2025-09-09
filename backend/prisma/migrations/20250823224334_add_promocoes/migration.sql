-- CreateEnum
CREATE TYPE "TipoPromocao" AS ENUM ('FIXO', 'PORCENTAGEM');

-- CreateEnum
CREATE TYPE "CondicaoTermino" AS ENUM ('ATE_ACABAR_ESTOQUE', 'QUANTIDADE_LIMITADA');

-- CreateTable
CREATE TABLE "promocoes" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "produto_id" TEXT NOT NULL,
    "tipo" "TipoPromocao" NOT NULL,
    "valor_desconto" DECIMAL(10,2),
    "porcentagem_desconto" DECIMAL(5,2),
    "preco_promocional" DECIMAL(10,2),
    "condicao_termino" "CondicaoTermino" NOT NULL,
    "quantidade_maxima" INTEGER,
    "quantidade_vendida" INTEGER NOT NULL DEFAULT 0,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promocoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promocoes" ADD CONSTRAINT "promocoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
