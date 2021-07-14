import {
  Resolver,
  Query,
  Ctx,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  UseMiddleware,
  FieldResolver,
  Root,
  ObjectType,
} from "type-graphql";
import { Post } from "../entities/post";
import { Context } from "../constants";
import { isAuth } from "../middleware/auth";
import { getConnection } from "typeorm";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field(() => Boolean)
  hasNext: boolean;
}

@Resolver(Post)
export default class PostResolver {
  @FieldResolver(() => String)
  text_snippet(@Root() root: Post) {
    return root.text.length < 50
      ? root.text
      : root.text.slice(0, 50).substr(0, root.text.lastIndexOf(" ")) + "...";
  }
  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, {
      nullable: true,
    })
    cursor: string | null
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit) + 1;
    let qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder("post")
      .orderBy('"created_at"', "DESC")
      .take(realLimit);
    if (cursor) {
      qb = qb.where('post."created_at" < :cursor', {
        cursor: new Date(cursor),
      });
    }

    const posts = await qb.getMany();
    return {
      posts: posts.slice(0, realLimit - 1),
      hasNext: posts.length === realLimit,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    return Post.findOne({ id });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: Context
  ): Promise<Post> {
    const creator_id = req.session.userId;
    return Post.create({ ...input, creator_id }).save();
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", { nullable: true }) title: string
  ): Promise<Post | undefined> {
    let post = await Post.findOne({ id });
    if (!post) return undefined;
    if (title) {
      post.title = title;
    }
    await Post.update(id, { title });
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id", () => Int) id: number): Promise<boolean> {
    (await Post.findOne(id))?.remove();

    return true;
  }
}
