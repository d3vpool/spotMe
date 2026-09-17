-- CreateIndex
CREATE INDEX "face_embedding_vector_hnsw_idx" ON "FaceEmbedding" USING hnsw (vector vector_l2_ops);
