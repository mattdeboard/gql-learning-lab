import DataLoader from 'dataloader';
import type { CommentEntity } from './data.ts';
import { getCommentTable } from './data.ts';

export type LoaderContext = {
  commentsForUserLoader: DataLoader<string, CommentEntity[], string>;
  commentsForPhotoLoader: DataLoader<string, CommentEntity[], string>;
};

export function loaderContext(): LoaderContext {
  return {
    commentsForUserLoader: commentDataLoaderBy('authorId'),
    commentsForPhotoLoader: commentDataLoaderBy('photoId'),
  };
}

function commentDataLoaderBy<TField extends keyof CommentEntity>(field: TField) {
  return new DataLoader(async (ids: readonly string[]) => {
    const comments = await getCommentTable().select().whereIn(field, ids);
    const groups = Map.groupBy(comments, (comment) => comment[field]);
    return ids.map((id) => groups.get(id) ?? []);
  });
}
