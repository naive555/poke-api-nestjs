import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1786452494975 implements MigrationInterface {
  name = 'InitialSchema1786452494975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password" character varying NOT NULL, "status" smallint NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pokemon" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "types" jsonb, "weight" integer NOT NULL, "height" integer NOT NULL, "abilities" jsonb, "species" character varying NOT NULL, "forms" jsonb, "status" smallint NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1cb8fc72a68e5a601312c642c82" UNIQUE ("name"), CONSTRAINT "PK_0b503db1369f46c43f8da0a6a0a" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pokemon"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
