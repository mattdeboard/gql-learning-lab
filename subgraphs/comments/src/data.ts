import { fileURLToPath } from 'node:url';
import { openDb } from '@lab/shared/db';

const connection = openDb('comments', fileURLToPath(new URL('../db/comments.sqlite', import.meta.url)));

export interface CommentEntity {
  id: string;
  photoId: string; // a photo owned by the photos subgraph
  authorId: string; // a user owned by the users subgraph
  body: string;
  createdAt: string;
}

const getCommentTable = () => connection<CommentEntity>('comments');

export async function getCommentById(id: string) {
  return await getCommentTable().where({ id }).first();
}

// Rows come back in whatever order SQLite returns them, not the order of `ids`,
// and missing ids are simply absent.
export async function getCommentsByIds(ids: readonly string[]) {
  return await getCommentTable().select().whereIn('id', ids);
}

export async function getCommentsByPhotoId(photoId: string) {
  return await getCommentTable().select().where({ photoId }).orderBy('createdAt');
}

// Comments for many photos in one query, all mixed together in a single array.
// Grouping them back by photoId is up to the caller.
export async function getCommentsByPhotoIds(photoIds: readonly string[]) {
  return await getCommentTable().select().whereIn('photoId', photoIds).orderBy('createdAt');
}
