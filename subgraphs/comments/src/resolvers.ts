import type { Resolvers } from '@lab/shared/resolvers';
import type { CommentsContext } from './context.ts';
import type { CommentEntity } from './data.ts';

export const resolvers: Resolvers = {
  Comment: {
    photo: (comment: CommentEntity) => {
      return { id: comment.photoId };
    },
    author: (comment: CommentEntity) => {
      return { id: comment.authorId };
    },
  },
  Photo: {
    comments: async ({ id }: { id: string }, _args, { commentsForPhotoLoader }: CommentsContext) => {
      return commentsForPhotoLoader.load(id);
    },
  },
  User: {
    comments: async ({ id }: { id: string }, _args, { commentsForUserLoader }: CommentsContext) => {
      return commentsForUserLoader.load(id);
    },
  },
  Query: {
    commentsForPhoto: async (
      _root,
      { photoId }: { photoId: string },
      { commentsForPhotoLoader }: CommentsContext,
    ) => {
      return commentsForPhotoLoader.load(photoId);
    },
    commentsForUser: async (
      _root,
      { userId }: { userId: string },
      { commentsForUserLoader }: CommentsContext,
    ) => {
      return commentsForUserLoader.load(userId);
    },
  },
};
