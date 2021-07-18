import { Context } from "src/constants";
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
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { Upvote } from "./../entities/Upvote";
import { isAuth } from "./../middleware/auth";

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

  @FieldResolver(() => User)
  creator(@Root() root: Post, @Ctx() { dataLoaders }: Context) {
    return dataLoaders.userLoader.load(root.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(@Root() root: Post, @Ctx() { dataLoaders, req }: Context) {
    const userId = req.session.userId;
    if (!userId) return null;
    const voteValue = await dataLoaders.upvoteLoader.load({
      postId: root.id,
      userId,
    });

    return voteValue ? voteValue.value : null;
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
    cursor: string | null
    // @Ctx() { req }: Context
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit) + 1;
    let qb = getConnection().query(
      `select p.*
       from post p 

      ${
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
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("text", { nullable: true }) text: string,
    @Ctx() { req }: Context
  ): Promise<Post | null> {
    // let post = await Post.findOne({ id });
    // if (!post) return null;
    return (
      await getConnection()
        .createQueryBuilder()
        .update(Post)
        .set({ text })
        .where('id=:id and "creatorId"=:creatorId', {
          id,
          creatorId: req.session.userId,
        })
        .returning("*")
        .execute()
    ).raw[0];

    // return await Post.update({ id, creatorId: req.session.userId }, { text });
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: Context
  ): Promise<boolean> {
    await Post.delete({ id, creatorId: req.session.userId }).catch(
      (err: Error) => {
        console.error(err);
        return false;
      }
    );

    return true;
  }
}
