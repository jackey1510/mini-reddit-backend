import { Upvote } from "./../entities/Upvote";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";
import { Context } from "../constants";
import { Post } from "../entities/post";
import { isAuth } from "../middleware/auth";

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
  textSnippet(@Root() root: Post) {
    return root.text.length < 50
      ? root.text
      : root.text.slice(0, 50).substr(0, root.text.lastIndexOf(" ")) + "...";
  }

  //   @FieldResolver(() => Int, { nullable: false })
  //   async voteStatus(@Root() root: Post, @Ctx() { req }: Context) {
  //     console.log(req.session);
  //     if (!req.session.userId) return 1;
  //     const vote = await Upvote.findOne({
  //       userId: req.session.userId,
  //       postId: root.id,
  //     });
  //     if (!vote) return 0;
  //     if (vote.value === 1) {
  //       console.log("up");
  //       return 1;
  //     }
  //     console.log("down");
  //     return -1;
  //   }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("value", () => Int) value: number,
    @Arg("postId", () => Int) postId: number,
    @Ctx() { req }: Context
  ) {
    const userId = req.session.userId;
    console.log(userId);
    const upOrDown = value !== -1 ? 1 : -1;
    console.log(postId);
    const vote = await Upvote.findOne({ where: { userId, postId } });
    if (!vote) {
      console.log("Havn't voted");
      try {
        await Upvote.insert({
          userId,
          postId,
          value: upOrDown,
        });
        await getConnection()
          .createQueryBuilder()
          .update(Post)
          .set({ points: () => `points + ${upOrDown}` })
          .where({ id: postId })
          .execute();
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    if (value === vote.value) {
      let delta = upOrDown === 1 ? -1 : 1;
      try {
        await vote.remove();
        await getConnection()
          .createQueryBuilder()
          .update(Post)
          .set({ points: () => `points + ${delta}` })
          .where({ id: postId })
          .execute();
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    try {
      console.log("----------------------");
      Upvote.update({ postId, userId }, { value: upOrDown });
      let delta = upOrDown === 1 ? 2 : -2;
      await getConnection()
        .createQueryBuilder()
        .update(Post)
        .set({ points: () => `points + ${delta}` })
        .where({ id: postId })
        .execute();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, {
      nullable: true,
    })
    cursor: string | null,
    @Ctx() { req }: Context
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit) + 1;
    let qb = getConnection().query(
      `select p.*, json_build_object('id',u.id, 'username',u.username,'email',u.email, 'createdAt',u."createdAt",'updatedAt',u."updatedAt") creator, ${
        req.session.userId
          ? `(select value from upvote where "userId" = ${req.session.userId} and "postId" = p.id ) "voteStatus"`
          : 'null as "voteStatus"'
      } from post p inner join public.user u on u.id = p."creatorId" ${
        cursor ? `where p."createdAt" < $2` : ""
      } order by p."createdAt" DESC limit $1`,
      cursor ? [limit, cursor] : [limit]
    );
    //   .getRepository(Post)
    //   .createQueryBuilder("post")
    //   .select("post")

    //   .innerJoinAndSelect("post.creator", "creator")
    //   .orderBy("post.createdAt", "DESC")
    //   .take(realLimit);
    // if (cursor) {
    //   qb = qb.where(`post."createdAt" < :cursor`, {
    //     cursor: new Date(cursor),
    //   });
    // }

    const posts = await qb;
    console.log(posts);
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
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: Context
  ): Promise<Post> {
    const creatorId: number = req.session.userId!;
    // console.log(creatorId);
    // const creator = await User.findOne(creatorId);
    return Post.create({
      ...input,
      creatorId: creatorId,
    }).save();
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
