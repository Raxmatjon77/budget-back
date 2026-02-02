import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import knex from 'knex';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: KNEX_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Knex => {
        return knex({
          client: 'pg',
          connection: {
            host: configService.get('DB_HOST') || 'localhost',
            port: Number(configService.get('DB_PORT')) || 5432,
            user: configService.get('DB_USER') || 'postgres',
            password: configService.get('DB_PASSWORD') || 'postgres',
            database: configService.get('DB_NAME') || 'family_finance',
          },
          pool: {
            min: 2,
            max: 10,
          },
          // Use snake_case for database columns
          // This is a naming convention helper
        });
      },
    },
  ],
  exports: [KNEX_CONNECTION],
})
export class KnexModule {}
