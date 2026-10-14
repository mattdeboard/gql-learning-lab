import type { GraphQLResolveInfo } from 'graphql';
import type { AuthContext } from './context.ts';

// A type for a subgraph's whole `resolvers` object, so individual resolver
// functions get their parameter types from it:
//
//   export const resolvers: Resolvers<{ User: { id: string } }> = { ... };
//                                     ^ entities this subgraph resolves, and their @key fields
//
// What's typed for you:
// - `context` (and `info`), in the right position for each kind of resolver
// - the `reference` passed to `__resolveReference`, for every entity you list:
//   { User: { id: string } } gives User.__resolveReference a
//   `{ __typename: 'User'; id: string }`. Keep this in sync with your @key by hand.
//
// What isn't: `parent` and `args` in ordinary field resolvers are `any`,
// because without codegen nothing knows your schema's shapes. Annotate them
// where you use them, e.g. `(log: DailyLogEntity) => log.created_by`.
// (Type-aware lint will flag unannotated `any` use, which is your reminder.)
//
// When your context grows (dataloaders), pass it second: Resolvers<{ ... }, MyContext>.
// A subgraph that resolves no entities can leave the first argument out: Resolvers.

// Deliberately `any`, not `unknown`: with `unknown`, TypeScript would reject a
// resolver that annotates its parent more narrowly, like `(user: UserEntity) => ...`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Untyped = any;

// Query.foo, DailyLog.notes, ...: (parent, args, context, info)
export type FieldResolver<TContext> = (
  parent: Untyped,
  args: Untyped,
  context: TContext,
  info: GraphQLResolveInfo,
) => unknown;

// Federation's entity resolver has a different shape: (reference, context, info).
// There is no `args`. Apollo's own GraphQLResolverMap type gets this wrong.
//
// Two TypeScript workarounds make this type fit together:
//
// 1. __resolveReference is written as a method, not an arrow-function property.
//    TypeScript checks method parameters loosely, so an entity's precisely typed
//    __resolveReference still fits the catch-all [typeName: string] in Resolvers.
//
// 2. The [fieldName: string] signature below also applies to the key
//    "__resolveReference", whose (reference, context, info) shape doesn't fit
//    FieldResolver's (parent, args, context, info). Adding `Function` to the
//    union makes it fit. Field resolvers are still typed from FieldResolver alone
//    (TypeScript skips `Function` when inferring parameter types), but a field
//    resolver with explicitly *wrong* parameter annotations won't be caught.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type AnyFunction = Function;

export type TypeResolvers<TContext, TReference = unknown> = {
  __resolveReference?(reference: TReference, context: TContext, info: GraphQLResolveInfo): unknown;
} & {
  [fieldName: string]: FieldResolver<TContext> | AnyFunction;
};

// The reference the router sends for an entity: its __typename plus its @key fields.
export type EntityReference<TTypeName extends string, TKeyFields> = { __typename: TTypeName } & TKeyFields;

export type Resolvers<
  TEntities extends Record<string, object> = Record<never, never>,
  TContext = AuthContext,
> = {
  // Entities you listed: __resolveReference gets a typed reference.
  [TypeName in keyof TEntities & string]?: TypeResolvers<
    TContext,
    EntityReference<TypeName, TEntities[TypeName]>
  >;
} & {
  // Everything else (Query, Mutation, DailyLog, ...). An unlisted type's
  // __resolveReference gets `unknown`: list it above, or annotate the parameter.
  [typeName: string]: TypeResolvers<TContext>;
};
