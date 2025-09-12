-- CreateEnum
CREATE TYPE "public"."FileType" AS ENUM ('PDF', 'TXT', 'DOCX', 'MD', 'CSV');

-- CreateEnum
CREATE TYPE "public"."IngestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."uploadStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ModelType" AS ENUM ('RETRIEVAL', 'GENERATOR');

-- CreateTable
CREATE TABLE "public"."API_KEYS" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "API_KEYS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DOCUMENTS" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" "public"."FileType" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uplaod_status" "public"."IngestionStatus" NOT NULL,
    "ingetion_status" "public"."IngestionStatus" NOT NULL,
    "error_message" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DOCUMENTS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MODELS" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "model_type" "public"."ModelType" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MODELS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PROJECTS" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "retrieval_model_id" TEXT NOT NULL,
    "generator_model_id" TEXT NOT NULL,
    "vector_db_collection_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PROJECTS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QUERY_LOGS" (
    "id" BIGSERIAL NOT NULL,
    "project_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "user_query" TEXT NOT NULL,
    "generated_response" TEXT NOT NULL,
    "citations" JSONB NOT NULL,
    "request_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QUERY_LOGS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."USERS" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "USERS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "USERS_username_key" ON "public"."USERS"("username");

-- CreateIndex
CREATE UNIQUE INDEX "USERS_email_key" ON "public"."USERS"("email");

-- AddForeignKey
ALTER TABLE "public"."API_KEYS" ADD CONSTRAINT "API_KEYS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."USERS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."API_KEYS" ADD CONSTRAINT "API_KEYS_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."PROJECTS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DOCUMENTS" ADD CONSTRAINT "DOCUMENTS_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."PROJECTS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MODELS" ADD CONSTRAINT "MODELS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."USERS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PROJECTS" ADD CONSTRAINT "PROJECTS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."USERS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QUERY_LOGS" ADD CONSTRAINT "QUERY_LOGS_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."PROJECTS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QUERY_LOGS" ADD CONSTRAINT "QUERY_LOGS_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."API_KEYS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
