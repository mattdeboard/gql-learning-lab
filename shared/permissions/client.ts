import { GraphQLError } from 'graphql';

export type PermissionOperation = 'create' | 'read' | 'update' | 'delete';
export type PermissionName = `${PermissionOperation}:${string}`;

export type IPermissionsApiClient = {
  authzCheck: (
    permissions: Map<string, { permissionName: PermissionName }[]>,
    projectId: string,
    permissionNames: PermissionName[],
  ) => boolean;
};

export default class PermissionsApiClient implements IPermissionsApiClient {
  constructor() {}

  public authzCheck(
    permissions: Map<string, { permissionName: PermissionName }[]>,
    projectId: string,
    permissionNames: PermissionName[],
  ): boolean {
    const perms = permissions.get(projectId);
    const projectPerms = perms?.map((p) => p.permissionName);
    if (!new Set(permissionNames).isSubsetOf(new Set(projectPerms))) {
      throw new GraphQLError('Forbidden by role', {
        extensions: {
          code: 'FORBIDDEN',
          http: {
            status: 403,
          },
        },
      });
    }
    return true;
  }
}
