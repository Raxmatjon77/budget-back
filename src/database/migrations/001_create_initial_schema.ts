import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Brothers/Users who can add income and share costs
  await knex.schema.createTable('brothers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('email', 255).unique().nullable();
    table.decimal('percentage', 5, 2).notNullable(); // Cost share percentage (45.00, 35.00, 20.00)
    table.timestamps(true, true);
    table.check('percentage > 0 AND percentage <= 100');
  });

  // Income transactions (money added to shared fund)
  await knex.schema.createTable('incomes', (table) => {
    table.increments('id').primary();
    table.integer('brother_id').unsigned().notNullable().references('id').inTable('brothers');
    table.integer('amount_cents').notNullable().unsigned(); // Amount in cents (must be positive)
    table.text('description').nullable();
    table.timestamps(true, true);
    table.check('amount_cents > 0');
  });

  // Outcome transactions (money spent from shared fund)
  await knex.schema.createTable('outcomes', (table) => {
    table.increments('id').primary();
    table.string('description', 500).notNullable();
    table.integer('total_amount_cents').notNullable().unsigned(); // Total cost in cents (must be positive)
    table.integer('created_by').unsigned().notNullable().references('id').inTable('brothers');
    table.timestamps(true, true);
    table.check('total_amount_cents > 0');
  });

  // Outcome splits (how each outcome is divided among brothers)
  await knex.schema.createTable('outcome_splits', (table) => {
    table.increments('id').primary();
    table.integer('outcome_id').unsigned().notNullable().references('id').inTable('outcomes').onDelete('CASCADE');
    table.integer('brother_id').unsigned().notNullable().references('id').inTable('brothers');
    table.decimal('percentage', 5, 2).notNullable(); // Percentage of this outcome for this brother
    table.integer('amount_cents').notNullable().unsigned(); // Pre-calculated for performance
    table.timestamps(true, true);
  });

  // Single shared balance (singleton pattern - only one row)
  await knex.schema.createTable('shared_balance', (table) => {
    table.increments('id').primary();
    table.integer('balance_cents').notNullable().defaultTo(0);
    table.timestamp('last_updated').defaultTo(knex.fn.now());
  });

  // Insert initial balance row
  await knex('shared_balance').insert({ balance_cents: 0 });

  // Transaction log for audit trail (immutable)
  await knex.schema.createTable('transaction_log', (table) => {
    table.increments('id').primary();
    table.enum('transaction_type', ['income', 'outcome']).notNullable();
    table.integer('reference_id').notNullable(); // income_id or outcome_id
    table.integer('brother_id').unsigned().nullable().references('id').inTable('brothers');
    table.integer('amount_cents').notNullable(); // Can be negative (outcome) or positive (income)
    table.integer('balance_after_cents').notNullable(); // Balance after this transaction
    table.timestamps(true, true);
  });

  // Indexes for performance
  await knex.raw('CREATE INDEX idx_incomes_brother_id ON incomes(brother_id)');
  await knex.raw('CREATE INDEX idx_incomes_created_at ON incomes(created_at DESC)');
  await knex.raw('CREATE INDEX idx_outcomes_created_at ON outcomes(created_at DESC)');
  await knex.raw('CREATE INDEX idx_outcomes_created_by ON outcomes(created_by)');
  await knex.raw('CREATE INDEX idx_transaction_log_created_at ON transaction_log(created_at DESC)');
  await knex.raw('CREATE INDEX idx_transaction_log_type ON transaction_log(transaction_type)');
  await knex.raw('CREATE INDEX idx_outcome_splits_outcome_id ON outcome_splits(outcome_id)');
  await knex.raw('CREATE INDEX idx_outcome_splits_brother_id ON outcome_splits(brother_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transaction_log');
  await knex.schema.dropTableIfExists('shared_balance');
  await knex.schema.dropTableIfExists('outcome_splits');
  await knex.schema.dropTableIfExists('outcomes');
  await knex.schema.dropTableIfExists('incomes');
  await knex.schema.dropTableIfExists('brothers');
}
