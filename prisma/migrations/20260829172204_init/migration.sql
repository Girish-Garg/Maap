-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL DEFAULT '',
    "business_address" TEXT,
    "business_phone" TEXT,
    "logo_url" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_dimensions" (
    "user_id" UUID NOT NULL,
    "patia_lengths_ft" JSONB NOT NULL DEFAULT '[1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]',
    "patia_widths_in" JSONB NOT NULL DEFAULT '[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]',
    "patia_thicknesses_in" JSONB NOT NULL DEFAULT '[1, 1.5, 2]',
    "pawa_lengths_in" JSONB NOT NULL DEFAULT '[12, 15, 16, 18, 21, 24, 30, 36]',
    "pawa_sizes" JSONB NOT NULL DEFAULT '[2, 2.5, 3]',

    CONSTRAINT "user_dimensions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_name" TEXT,
    "client_address" TEXT,
    "project_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "notes" TEXT,
    "public_share_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patia_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "length_ft" DECIMAL NOT NULL,
    "width_in" DECIMAL NOT NULL,
    "thickness_in" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "patia_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pawa_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "length_in" DECIMAL NOT NULL,
    "size_side" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "pawa_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_configs" (
    "project_id" UUID NOT NULL,
    "frame_3_4" DECIMAL NOT NULL DEFAULT 320,
    "patia_1_5_to_4" DECIMAL NOT NULL DEFAULT 420,
    "patia_4_5_to_5" DECIMAL NOT NULL DEFAULT 520,
    "patia_5_5_to_up" DECIMAL NOT NULL DEFAULT 620,
    "pawa" DECIMAL NOT NULL DEFAULT 510,

    CONSTRAINT "price_configs_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "project_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "label" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_public_share_id_key" ON "projects"("public_share_id");

-- CreateIndex
CREATE INDEX "projects_user_updated" ON "projects"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "patia_entries_project_id_length_ft_width_in_thickness_in_key" ON "patia_entries"("project_id", "length_ft", "width_in", "thickness_in");

-- CreateIndex
CREATE UNIQUE INDEX "pawa_entries_project_id_length_in_size_side_key" ON "pawa_entries"("project_id", "length_in", "size_side");

-- CreateIndex
CREATE INDEX "snapshots_project_created" ON "project_snapshots"("project_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "patia_entries" ADD CONSTRAINT "patia_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pawa_entries" ADD CONSTRAINT "pawa_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_configs" ADD CONSTRAINT "price_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
