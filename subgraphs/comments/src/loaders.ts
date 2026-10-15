import type DataLoader from 'dataloader';
import { groupedLoader } from '@lab/shared/loaders';
import type { CommentEntity } from './data.ts';
import { getCommentTable } from './data.ts';

export type LoaderContext = {
  commentsForUserLoader: DataLoader<string, CommentEntity[], string>;
  commentsForPhotoLoader: DataLoader<string, CommentEntity[], string>;
};

export function loaderContext(): LoaderContext {
  return {
    commentsForUserLoader: groupedLoader(getCommentTable, 'authorId'),
    commentsForPhotoLoader: groupedLoader(getCommentTable, 'photoId'),
  };
}
