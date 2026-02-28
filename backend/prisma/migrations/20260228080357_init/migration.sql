-- CreateTable
CREATE TABLE "stocks" (
    "stock_code" TEXT NOT NULL PRIMARY KEY,
    "stock_name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "industry" TEXT,
    "list_date" DATETIME NOT NULL,
    "market_cap" REAL,
    "avg_turnover" REAL,
    "admission_status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "kline_data" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock_code" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "period" TEXT NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'tushare',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kline_data_stock_code_fkey" FOREIGN KEY ("stock_code") REFERENCES "stocks" ("stock_code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "technical_indicators" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock_code" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "period" TEXT NOT NULL,
    "indicator_type" TEXT NOT NULL,
    "values" TEXT NOT NULL,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technical_indicators_stock_code_fkey" FOREIGN KEY ("stock_code") REFERENCES "stocks" ("stock_code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "preferences" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "stock_code" TEXT NOT NULL,
    "group_name" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_stock_code_fkey" FOREIGN KEY ("stock_code") REFERENCES "stocks" ("stock_code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "screener_strategies" (
    "strategy_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "strategy_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "screener_strategies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "filter_conditions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "strategy_id" TEXT NOT NULL,
    "condition_type" TEXT NOT NULL,
    "indicator_name" TEXT,
    "operator" TEXT,
    "target_value" REAL,
    "pattern" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "filter_conditions_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "screener_strategies" ("strategy_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "drawings" (
    "drawing_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "stock_code" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "drawing_type" TEXT NOT NULL,
    "coordinates" TEXT NOT NULL,
    "style_preset" TEXT NOT NULL DEFAULT 'default',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drawings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "drawings_stock_code_fkey" FOREIGN KEY ("stock_code") REFERENCES "stocks" ("stock_code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "update_logs" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "total_stocks" INTEGER NOT NULL,
    "processed_stocks" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_details" TEXT,
    "start_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" DATETIME
);

-- CreateIndex
CREATE INDEX "stocks_admission_status_idx" ON "stocks"("admission_status");

-- CreateIndex
CREATE INDEX "stocks_market_idx" ON "stocks"("market");

-- CreateIndex
CREATE INDEX "kline_data_stock_code_period_date_idx" ON "kline_data"("stock_code", "period", "date");

-- CreateIndex
CREATE INDEX "kline_data_date_idx" ON "kline_data"("date");

-- CreateIndex
CREATE UNIQUE INDEX "kline_data_stock_code_date_period_key" ON "kline_data"("stock_code", "date", "period");

-- CreateIndex
CREATE INDEX "technical_indicators_stock_code_period_indicator_type_date_idx" ON "technical_indicators"("stock_code", "period", "indicator_type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "technical_indicators_stock_code_date_period_indicator_type_key" ON "technical_indicators"("stock_code", "date", "period", "indicator_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "favorites_user_id_sort_order_idx" ON "favorites"("user_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_stock_code_key" ON "favorites"("user_id", "stock_code");

-- CreateIndex
CREATE INDEX "screener_strategies_user_id_idx" ON "screener_strategies"("user_id");

-- CreateIndex
CREATE INDEX "filter_conditions_strategy_id_sort_order_idx" ON "filter_conditions"("strategy_id", "sort_order");

-- CreateIndex
CREATE INDEX "drawings_user_id_stock_code_period_idx" ON "drawings"("user_id", "stock_code", "period");

-- CreateIndex
CREATE INDEX "update_logs_start_time_idx" ON "update_logs"("start_time");
