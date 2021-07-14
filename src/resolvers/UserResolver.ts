import { validateRegister } from "./../utils/validateRegister";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "./../constants";
// import { EntityManager } from "@mikro-orm/core";
import { User } from "./../entities/User";
import { v4 } from "uuid";
import {
  Resolver,
  Ctx,
  Arg,
  Mutation,
  InputType,
  Field,
  ObjectType,
  Query,
  FieldResolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { Context } from "../constants";
import { sendEmail } from "../utils/sendEmail";
@InputType()
export class UserInput {
  @Field()
  username: string;
  @Field()
  password: string;
  @Field()
  email: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export default class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: Context) {
    if (req.session.userId === user.id) {
      return user.email;
    }
    return "";
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: Context): Promise<User | undefined> {
    if (!req.session.userId) {
      return undefined;
    }
    return await User.findOne({ id: Number(req.session.userId) });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("input", () => UserInput) input: UserInput,
    @Ctx() {}: Context
  ): Promise<UserResponse> {
    const errors = validateRegister(input);
    if (errors?.length > 0)
      return {
        errors,
      };
    const hashedPassword = await argon2.hash(input.password);
    let user = User.create({
      username: input.username.toLowerCase(),
      password: hashedPassword,
      email: input.email,
    });

    const existingUser = await User.findOne({
      where: [{ username: input.username }, { email: input.email }],
    });
    if (existingUser) {
      let res: UserResponse = {
        errors: [
          {
            field: "username",
            message: "taken",
          },
          {
            field: "email",
            message: "taken",
          },
        ],
      };
      return res;
    }
    // const [result] = await (em as EntityManager)
    //   .createQueryBuilder(User)
    //   .getKnexQuery()
    //   .insert({
    //     username: input.username,
    //     password: hashedPassword,
    //     email: input.email,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //   })
    //   .returning("*");
    await user.save();

    // user = result;
    // return { user };
    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: Context
  ): Promise<UserResponse> {
    const user = await User.findOne({
      where: [
        { username: usernameOrEmail.toLowerCase() },
        { email: usernameOrEmail.toLowerCase() },
      ],
    });
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "not exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "incorrect",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: Context): Promise<boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          console.error(err);
          return resolve(false);
        }
        res.clearCookie(COOKIE_NAME);
        return resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async resetPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: Context
  ): Promise<boolean> {
    const user = await User.findOne({ email });
    if (!user) {
      return true;
    }

    const token = v4();

    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    );

    let html = `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`;
    await sendEmail(email, html);
    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req, redis }: Context
  ): Promise<UserResponse> {
    if (newPassword.length < 2) {
      return {
        errors: [
          {
            field: "username",
            message: "length must be greater than 2",
          },
        ],
      };
    }
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "expired" }],
      };
    }

    const user = await User.findOne({ id: Number(userId) });
    if (!user) {
      return {
        errors: [{ field: "token", message: "user no longer exist" }],
      };
    }

    //sign in
    req.session.userId = user.id;
    user.password = await argon2.hash(newPassword);
    await user.save();
    await redis.del(key);

    return { user };
  }
}
