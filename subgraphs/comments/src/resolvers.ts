import { type Resolvers } from '@lab/shared/resolvers';
import type { CommentsContext } from './context.ts';
import type { CommentEntity } from './data.ts';

export const resolvers: Resolvers<never, CommentsContext> = {
  Comment: {
    photo: (comment: CommentEntity) => {
      return { id: comment.photoId };
    },
    author: (comment: CommentEntity) => {
      return { id: comment.authorId };
    },
  },
  Photo: {
    comments: async ({ id }: { id: string }, _args, { commentsForPhotoLoader }) => {
      return commentsForPhotoLoader.load(id);
    },
  },
  User: {
    comments: async ({ id }: { id: string }, _args, { commentsForUserLoader }) => {
      return commentsForUserLoader.load(id);
    },
  },
  Query: {
    commentsForPhoto: async (_root, { photoId }: { photoId: string }, { commentsForPhotoLoader }) => {
      return commentsForPhotoLoader.load(photoId);
    },
    commentsForUser: async (
      _root,
      { userId }: { userId: string },
      { commentsForUserLoader, getPermissions },
    ) => {
      const perms = await getPermissions();
      const comments = await commentsForUserLoader.load(userId);
      const allowed = new Set(Object.keys(perms).filter((p: string) => perms[p]?.includes('read:comments')));
      return comments.filter((c) => allowed.has(c.projectId));
    },
  },
};
