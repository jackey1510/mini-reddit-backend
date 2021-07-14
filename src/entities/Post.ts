import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  RelationId,
  OneToMany,
} from "typeorm";
import { ObjectType, Field, Int } from "type-graphql";
import { User } from "./User";
import { Upvote } from "./Upvote";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field(() => User)
  @ManyToOne(() => User, (creator) => creator.posts)
  creator!: Promise<User>;

  @Field(() => Int)
  @RelationId((post: Post) => post.creator)
  @Column()
  creatorId!: number;

  @Field(() => [Upvote])
  @OneToMany(() => Upvote, (upvote) => upvote.post)
  upvotes: Promise<Upvote[]>;
}
