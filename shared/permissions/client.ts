import { GraphQLError } from 'graphql';
import { createSubgraphLogger, type Logger } from '../log.ts';

export type PermissionOperation = 'create' | 'read' | 'update' | 'delete';
export type ResourcePermission = `${PermissionOperation}:${string}`;
export type UserResourcePermissionsForProject = { [projectId: string]: ResourcePermission[] };

export type IPermissionsApiClient = {
  authzCheck: (
    permissions: UserResourcePermissionsForProject,
    projectId: string,
    permissionNames: ResourcePermission[],
  ) => boolean;
  getResourcePermsForUser: (userId: string) => Promise<UserResourcePermissionsForProject>;
};

export default class PermissionsApiClient implements IPermissionsApiClient {
  private logger: Logger;
  private baseUrl: string;

  constructor(subgraph: string, scheme = 'http', host = 'localhost', port = 4003) {
    this.logger = createSubgraphLogger(subgraph);
    this.baseUrl = `${scheme}://${host}:${port}`;
  }

  authzCheck(
    permissions: UserResourcePermissionsForProject,
    projectId: string,
    permissionNames: ResourcePermission[],
  ): boolean {
    const perms = permissions[projectId] ?? [];
    if (!new Set(permissionNames).isSubsetOf(new Set(perms))) {
      throw new GraphQLError('Forbidden by role', {
        extensions: {
          code: 'FORBIDDEN',
        },
      });
    }
    return true;
  }

  async getResourcePermsForUser(userId: string | null): Promise<UserResourcePermissionsForProject> {
    if (userId === null) return {};

    const res = await fetch(this.userPermsForProjectUrl(userId), {
      method: 'GET',
    });
    const { permissions } = (await res.json()) as { permissions: UserResourcePermissionsForProject };
    this.logger.info(`Resource perms for user: ${JSON.stringify(permissions)}`);
    return permissions;
  }

  private userPermsForProjectUrl(userId: string) {
    return `${this.baseUrl}/internal/${userId}/permissions/`;
  }
}
