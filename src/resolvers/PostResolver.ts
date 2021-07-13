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
} from "type-graphql";
import { Post } from "../entities/post";
import { Context } from "../constants";
import { isAuth } from "../middleware/auth";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@Resolver()
export default class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
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
    const creatorId = req.session.userId;
    return Post.create({ ...input, creatorId }).save();
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
