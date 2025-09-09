-- CreateEnum para TipoAlcancePromocao se não existir
DO $$ BEGIN
  CREATE TYPE "TipoAlcancePromocao" AS ENUM ('PRODUTO', 'LABORATORIO', 'LOTE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum para CondicaoTermino se não existir  
DO $$ BEGIN
  CREATE TYPE "CondicaoTermino" AS ENUM ('DATA', 'QUANTIDADE', 'DATA_OU_QUANTIDADE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna tipo_alcance se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'promocoes' 
                 AND column_name = 'tipo_alcance') THEN
    ALTER TABLE "promocoes" ADD COLUMN "tipo_alcance" "TipoAlcancePromocao" NOT NULL DEFAULT 'PRODUTO';
  END IF;
END $$;

-- Adicionar coluna laboratorio se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'promocoes' 
                 AND column_name = 'laboratorio') THEN
    ALTER TABLE "promocoes" ADD COLUMN "laboratorio" VARCHAR(100);
  END IF;
END $$;

-- Tornar produto_id opcional (pode ser null para promoções por laboratório)
ALTER TABLE "promocoes" ALTER COLUMN "produto_id" DROP NOT NULL;

-- Adicionar coluna lote_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'promocoes' 
                 AND column_name = 'lote_id') THEN
    ALTER TABLE "promocoes" ADD COLUMN "lote_id" TEXT;
  END IF;
END $$;

-- Adicionar foreign key para lote_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'promocoes_lote_id_fkey') THEN
    ALTER TABLE "promocoes" ADD CONSTRAINT "promocoes_lote_id_fkey" 
    FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Criar tabela PromocaoLote se não existir
CREATE TABLE IF NOT EXISTS "promocoes_lotes" (
    "id" TEXT NOT NULL,
    "promocao_id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "quantidade_aplicavel" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promocoes_lotes_pkey" PRIMARY KEY ("id")
);

-- Criar índice único se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                 WHERE tablename = 'promocoes_lotes' 
                 AND indexname = 'promocoes_lotes_promocao_id_lote_id_key') THEN
    CREATE UNIQUE INDEX "promocoes_lotes_promocao_id_lote_id_key" ON "promocoes_lotes"("promocao_id", "lote_id");
  END IF;
END $$;

-- Adicionar foreign keys se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'promocoes_lotes_promocao_id_fkey') THEN
    ALTER TABLE "promocoes_lotes" ADD CONSTRAINT "promocoes_lotes_promocao_id_fkey" 
    FOREIGN KEY ("promocao_id") REFERENCES "promocoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'promocoes_lotes_lote_id_fkey') THEN
    ALTER TABLE "promocoes_lotes" ADD CONSTRAINT "promocoes_lotes_lote_id_fkey" 
    FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;