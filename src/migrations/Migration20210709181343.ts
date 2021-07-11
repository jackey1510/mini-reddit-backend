import { Migration } from '@mikro-orm/migrations';

export class Migration20210709181343 extends Migration {

  async up(): Promise<void> {
    this.addSql('drop table if exists "base" cascade;');
  }

}
