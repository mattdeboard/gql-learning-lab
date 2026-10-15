import type { Resolvers } from '@lab/shared/resolvers';
import type { PhotosContext } from './context.ts';
import {
  addPhoto,
  deletePhoto,
  updatePhoto,
  type PhotoEntity,
  type PhotoUpdateInput,
  type PhotoUploadInput,
} from './data.ts';

export const resolvers: Resolvers<{ Photo: { id: string } }> = {
  Photo: {
    uploadedBy: (photo: PhotoEntity) => {
      return { id: photo.uploadedBy };
    },
    project: (photo: PhotoEntity) => {
      return { id: photo.projectId };
    },
    dailyLog: (photo: PhotoEntity) => {
      return { id: photo.dailyLogId };
    },
    __resolveReference: async ({ id }, { photosByIdLoader }: PhotosContext, _info) => {
      return photosByIdLoader.load(id);
    },
  },
  Query: {
    projectPhotos: async (
      _root,
      { projectId }: { projectId: string },
      { photosByProjectLoader }: PhotosContext,
    ) => {
      return photosByProjectLoader.load(projectId);
    },
    dailyLogPhotos: async (
      _root,
      { dailyLogId }: { dailyLogId: string },
      { photosByDailyLogLoader }: PhotosContext,
    ) => {
      return photosByDailyLogLoader.load(dailyLogId);
    },
    userPhotos: async (_root, { userId }: { userId: string }, { photosByUserLoader }: PhotosContext) => {
      return photosByUserLoader.load(userId);
    },
  },
  Mutation: {
    addPhoto: async (_root, { input }: { input: PhotoUploadInput }) => {
      // TODO: Check project permissions before allowing this
      return await addPhoto(input);
    },
    deletePhoto: async (_root, { id }: { id: string }) => {
      // TODO: Check project permissions before allowing this
      return await deletePhoto(id);
    },
    updatePhoto: async (_root, { input }: { input: PhotoUpdateInput }) => {
      // TODO: Check project permissions before allowing this
      return updatePhoto(input);
    },
  },
  DailyLog: {
    photos: async (obj: { id: string | null }, _args, { photosByDailyLogLoader }: PhotosContext) => {
      if (!obj.id) return null;
      return photosByDailyLogLoader.load(obj.id);
    },
  },
  Project: {
    photos: async ({ id }: { id: string }, _args, { photosByProjectLoader }: PhotosContext) => {
      return photosByProjectLoader.load(id);
    },
  },
  User: {
    photos: async ({ id }: { id: string }, _args, { photosByUserLoader }: PhotosContext) => {
      return photosByUserLoader.load(id);
    },
  },
};
