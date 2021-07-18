import { ObjectType, Field, Int } from "type-graphql";
import {
  Entity,
  Column,
  BaseEntity,
  ManyToOne,
  RelationId,
  PrimaryColumn,
} from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Upvote extends BaseEntity {
  @Field(() => Int)
  @Column({ type: "int" })
  value: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.upvotes)
  user!: Promise<User>;

  @Field(() => Int)
  @RelationId((upvote: Upvote) => upvote.user)
  @PrimaryColumn()
  userId!: number;

  @Field(() => Post)
  @ManyToOne(() => Post, (post) => post.upvotes, { onDelete: "CASCADE" })
  post!: Promise<Post>;

  @Field(() => Int)
  @RelationId((upvote: Upvote) => upvote.post)
  @PrimaryColumn()
  postId!: number;
}
