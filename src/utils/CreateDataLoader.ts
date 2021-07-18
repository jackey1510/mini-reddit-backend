import DataLoader from "dataloader";
import { User } from "../entities/User";
import { Upvote } from "../entities/Upvote";

export const createUserLoader = () => {
  return new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};
    users.forEach((u) => {
      userIdToUser[u.id] = u;
    });
    return userIds.map((userId) => userIdToUser[userId]);
  });
};

export const createUpvoteLoader = () => {
  return new DataLoader<{ postId: number; userId: number }, Upvote | null>(
    async (keys) => {
      const upvotes = await Upvote.findByIds(keys as any);
      const upvoteIdToUpvote: Record<string, Upvote> = {};
      upvotes.forEach((u) => {
        upvoteIdToUpvote[`${u.userId}|${u.postId}`] = u;
      });
      return keys.map((key) => upvoteIdToUpvote[`${key.userId}|${key.postId}`]);
    }
  );
};
