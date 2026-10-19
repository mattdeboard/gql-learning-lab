# Authn & Authz Design

## Where/When is Authn & Role-based Authz checked?

There are a few times/places we could get a user's memberships:

1. **At login** - On logging in, we pack the memberships into the JWT token the client receives & sends.
   1. This has a huge downside of increasing client request size. This is a problem since we're concerned about operating in low-bandwidth environments.
   2. Another downside is that memberships are frozen at whatever was true at the time of login. So therefore our system wouldn't fetch membership updates until the login token expired.
2. **At the router** - For each request, the router makes the call to Permissions service, then packs the memberships into a custom header (e.g. `X-Permissions: "[['project-1', 'SUPERINTENDENT'], ['project-983', 'VIEWER']]"`) that propagates to each subgraph. Relies on a co-processor.
   1. This would be my first choice for a GraphOS-enabled project.
   2. It is a feature of GraphOS (available even on free plans, tho it is rate limited).
   3. We will do this in Level 7 of this project.
3. **At the BFF** - Follows the same pattern as the "At the router" option, except it's the BFF that packs the memberships into a custom header.
   1. This would be my fallback choice to the coprocessor option, as it's technically possible to circumvent the BFF and talk right to the router.
4. **In the subgraphs** - Each subgraph makes its own call to permissions to retrieve roles for the logged-in user.
   1. This is costly in practice. It results in N calls to Permissions for N subgraphs involved in fulfilling a query.
   2. Also increases adoption overhead for each service, since each team will have to also think about permissions-checks for each request.

In each case, there's an additional call to Permissions to retrieve the permissions for each role, at the right scope for the request.

### So... what are we doing in this project?

In this project, we are going to go with **In the subgraphs**. The real answer I would pick, with all things being equal, is number 2 as the first choice, and number 3 as the fallback.

In Level 7 of this project, we will in fact do option #2.

## Roles

A role is assigned to a user in a project. We reify "a user in a project" in these ways:

- a `MembershipEntity` in Typescript code
- a `Membership` type in the GraphQL schema
- a row on the `project_memberships` table

### Where are project roles stored?

Project roles are stored in the Permissions service, in the `project_memberships` table.

### Who can access all/any roles for a given project?

Only superintendents can access all/any roles for a given project. Any role for any project can be accessed by any user with a SUPERINTENDENT role in the project.

### Who can access all/any roles for a given user?

Only the authenticated user can see any or all of their own roles across all projects.

### Who can add/update roles for a given project?

Only superintendents for a given project can add or update roles. Adding a role is functionally the same as adding a user to a project.

## Permissions

There are four permissions recognized by our system, corresponding to operations:

1. create
   1. A `POST` in the REST API
   2. A `Mutation` in the GQL graph
2. read
   1. A `GET` in the REST API
   2. A `Query` in the GQL graph
3. update
   1. A `PUT` or `PATCH` in the REST API
   2. A `Mutation` in the GQL graph
4. delete
   1. A `DELETE` in the REST API
   2. A `Mutation` in the GQL graph

### Permission data

Permissions will be stored on a `permissions` table in the `permissions` database:

```sql
CREATE TABLE permissions (
  permission_id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('SUPERINTENDENT', 'PROJECT_MANAGER', 'VIEWER')),
  project_id TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  UNIQUE (project_id, role, permission_name)
);

CREATE INDEX permission_by_name_idx ON permissions(permission_name);
```

### Permission structure

A permission has the following dimensions:

1. Role
2. Project ID
3. Permission name

> [!IMPORTANT] Uniqueness Constraint
> A permission must be unique over (role, project ID, permission name).

### Resource permissions

A resource permission is a string sigil in the format:

```text
{operation}:{resource}
```

For example, the resource permission for creating a daily log would look like:

```text
create:daily-logs
```

The resource permission for deleting comments would look like:

```text
delete:comments
```

A single tuple from the `permissions` table for `delete:comments` resource permission would look something like:

```code
(1, 'SUPERINTENDENT', 'project-1', 'delete:comments')
```

> [!TIP] Row-Level Security
> Deleting one's own comments is an example of a row-level, request-scoped authorization. It is not a role-based permission, so therefore it won't be reflected in the permissions table. Rather it's enforced at the API layer.

## Permissions API design considerations

There are some decisions I've made I want to document around the design of the permissions APIs (both REST and GraphQL):

1. How resource permissions are declared/created
2. The nature & location of the contract between the Permissions API and client services

### Resource permissions registration

In a real scenario, we would want our Permissions service to support registration of entity permissions. So some arbitrary service, e.g. "Frogs service" ("Frog" is just an arbitrary noun here), would be able to register resource permissions like:

```ts
`${'create' | 'read' | 'update' | 'delete'}:frog`;
```

This registration would simply be an HTTP POST something like:

```http
POST /internal/resource-permission/ HTTP/1.1
Content-Type: application/json

{
  "serviceId": "frogs",
  "resourcePermissions": [
    "create:frog",
    "read:frog",
    "update:frog",
    "delete:frog"
  ]
}
```

Something like that. (With maybe some role->permission registrations too?)

However, for this learning lab project, I've made the "executive decision" that, for now, all resource permissions will be a static set of possibilities, and the set of possible resource permissions lives in the database:

```sql
SELECT DISTINCT permission_name
FROM permissions;
```

### Permissions API contract

In a production environment, we'd want to publish two things from the Permissions service:

1. a Permissions API client in Typescript
2. an OpenAPI spec from the Permissions service for non-Typescript services to build a client in their language

For the purposes of this learning lab, however, at least in Level 4 where I'm writing this comment, I've decided to not go down that rabbit hole right now. But it is the right thing, and I want to record that in this doc for posterity.

Instead, the types and utility functions are mostly in `subgraphs/permissions/`, with a couple in [`shared/permissions/client.ts`](../shared/permissions/client.ts).
