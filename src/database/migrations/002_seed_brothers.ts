import { Knex } from 'knex';

const BROTHERS_DEFAULT_DATA = [
  { name: "Ro'zimboy", percentage: 45 },
  { name: 'Raxmatjon', percentage: 35 },
  { name: 'Javoxir', percentage: 20 },
];

export async function up(knex: Knex): Promise<void> {
  // Insert default brothers
  await knex('brothers').insert(BROTHERS_DEFAULT_DATA);
}

export async function down(knex: Knex): Promise<void> {
  // Remove all brothers (truncate to reset ID sequence)
  await knex('brothers').truncate();
}
