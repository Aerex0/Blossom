-- DropTable
ALTER TABLE "Document" DROP COLUMN "content";

-- CreateTable
CREATE TABLE "DocumentShare" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YjsUpdate" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "update" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YjsUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YjsSnapshot" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "seq" BIGINT NOT NULL,
    "snapshot" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YjsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentShare_documentId_idx" ON "DocumentShare"("documentId");

-- CreateIndex
CREATE INDEX "YjsUpdate_documentId_seq_idx" ON "YjsUpdate"("documentId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "YjsSnapshot_documentId_key" ON "YjsSnapshot"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YjsUpdate" ADD CONSTRAINT "YjsUpdate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YjsSnapshot" ADD CONSTRAINT "YjsSnapshot_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;