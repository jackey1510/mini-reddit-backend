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

@Resolver(Post)
export default class PostResolver {
  @FieldResolver(() => String)
  text_snippet(@Root() root: Post) {
    return root.text.length < 50
      ? root.text
      : root.text.slice(0, 50).substr(0, root.text.lastIndexOf(" ")) + "...";
  }
  @Query(() => [Post])
  posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, {
      nullable: true,
    })
    cursor: string | null
  ): Promise<Post[]> {
    const realLimit = Math.min(50, limit);
    let qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder("post")
      .orderBy('"created_at"', "DESC")
      .take(realLimit);
    if (cursor) {
      return qb
        .where('post."created_at" < :cursor', { cursor: new Date(cursor) })
        .getMany();
    }
    return qb.getMany();
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
