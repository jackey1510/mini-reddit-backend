import { Entity, Property, PrimaryKey } from "@mikro-orm/core";

import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity()
export class User {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => Date)
  @Property()
  createdAt: Date = new Date();

  @Field(() => Date)
  @Property({
    onUpdate: () => {
      return new Date();
    },
  })
  updatedAt: Date = new Date();

  @Field()
  @Property({ unique: true })
  username!: string;

  @Field()
  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;
}
