import DataLoader from 'dataloader';
import { groupedLoader } from '@lab/shared/loaders';
import { getDailyLogTable, getProjectTable, type DailyLogEntity, type ProjectEntity } from './data.ts';

const _GROUP_LOADERS = ['logsForProjectLoader', 'logsForUserLoader'] as const;

export type LoaderContext = {
  [key in (typeof _GROUP_LOADERS)[number]]: DataLoader<string, DailyLogEntity[], string>;
} & {
  logByIdLoader: DataLoader<string, DailyLogEntity | null, string>;
  projectByIdLoader: DataLoader<string, ProjectEntity | null, string>;
  projectByLogIdLoader: DataLoader<string, ProjectEntity | null, string>;
};

export function loaderContext(): LoaderContext {
  return {
    logsForProjectLoader: groupedLoader(getDailyLogTable, 'projectId'),
    logsForUserLoader: groupedLoader(getDailyLogTable, 'createdBy'),
    logByIdLoader: logByIdLoader(),
    projectByIdLoader: projectByIdLoader(),
    projectByLogIdLoader: projectByLogIdLoader(),
  };
}

function logByIdLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const logs = await getDailyLogTable().select().whereIn('id', ids);
    const map = new Map(logs.map((log) => [log.id, log]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

function projectByIdLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const projects = await getProjectTable().select().whereIn('id', ids);
    const map = new Map(projects.map((pj) => [pj.id, pj]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

function projectByLogIdLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const logs = await getDailyLogTable().select('id', 'projectId').whereIn('id', ids);
    const projectIds = logs.map((l) => l.projectId);
    const projects = await getProjectTable().select().distinct().whereIn('id', projectIds);
    const projectIdMap = new Map(projects.map((pj) => [pj.id, pj]));
    const logIdToProject = new Map(logs.map((log) => [log.id, projectIdMap.get(log.projectId)]));
    return ids.map((id) => logIdToProject.get(id) ?? null);
  });
}
