import { Resolver, Query, Ctx, Arg, Int, Mutation } from "type-graphql";
import { Post } from "../entities/post";
import { Context } from '../constants'


@Resolver()
export default class PostResolver {
    @Query(() => [Post])
    posts(
        @Ctx() { em }: Context
    ): Promise<Post[]> {
        return em.find(Post, {})
    }

    @Query(() => Post, { nullable: true })
    post(
        @Arg("id", () => Int) id: number,
        @Ctx() { em }: Context
    ): Promise<Post | null> {
        return em.findOne(Post, { id })
    }

    @Mutation(() => Post)
    async createPost(
        @Arg("title") title: string,
        @Ctx() { em }: Context
    ): Promise<Post> {
        const post = em.create(Post, { title })
        await em.persistAndFlush(post)
        return post;
    }

    @Mutation(() => Post)
    async updatePost(
        @Arg("id", () => Int) id: number,
        @Arg("title", { nullable: true }) title: string,
        @Ctx() { em }: Context
    ): Promise<Post | null> {

        const post = await em.findOne(Post, { id })
        if (!post) return null;
        if (title) {
            post.title = title
        }
        await em.persistAndFlush(post)
        return post;
    }

    @Mutation(() => Boolean)
    async deletePost(
        @Arg("id", () => Int) id: number,
        @Ctx() { em }: Context
    ): Promise<boolean> {

        await em.nativeDelete(Post, { id }).catch()

        return true
    }
}