import { createEntity, undo } from "metabase/lib/entities";

import { color } from "metabase/lib/colors";
import * as Urls from "metabase/lib/urls";

import { CollectionSchema } from "metabase/schema";
import { createSelector } from "reselect";

import { GET } from "metabase/lib/api";

import { getUserPersonalCollectionId } from "metabase/selectors/user";
import { isPersonalCollection } from "metabase/collections/utils";

import { t } from "ttag";

import { PLUGIN_COLLECTIONS } from "metabase/plugins";
import { getFormSelector } from "./collections/forms";
import { getPersonalCollectionId } from "metabase/lib/collection";

const listCollectionsTree = GET("/api/v1/collection/tree/customize");
const listCollections = GET("/api/v1/collection");

export const ROOT_COLLECTION = {
  id: "root",
  name: t`Public analytics`,
  location: "",
  path: [],
};

export const PERSONAL_COLLECTION = {
  id: undefined, // to be filled in by getExpandedCollectionsById
  name: t`My personal collection`,
  location: "/",
  path: [ROOT_COLLECTION.id],
  can_write: true,
};

// fake collection for admins that contains all other user's collections
export const PERSONAL_COLLECTIONS = {
  id: "personal", // placeholder id
  name: t`All personal collections`,
  location: "/",
  path: [ROOT_COLLECTION.id],
  can_write: false,
};

const Collections = createEntity({
  name: "collections",
  path: "/api/collection",
  schema: CollectionSchema,

  displayNameOne: t`collection`,
  displayNameMany: t`collections`,

  api: {
    list: async (params, ...args) =>
      /* Parts of the UI, like ItemPicker don't yet know about the /tree endpoint and break if it's used,
      so choose which endpoint to use based on the presence of a "tree" param
      */
      params && params.tree
        ? listCollectionsTree(params, ...args)
        : listCollections(params, ...args),
  },

  objectActions: {
    setArchived: ({ id }, archived, opts) =>
      Collections.actions.update(
        { id },
        { archived },
        undo(opts, "collection", archived ? "archived" : "unarchived"),
      ),

    setCollection: ({ id }, collection, opts) =>
      Collections.actions.update(
        { id },
        { parent_id: canonicalCollectionId(collection && collection.id) },
        undo(opts, "collection", "moved"),
      ),

    // NOTE: DELETE not currently implemented
    delete: null,
  },

  objectSelectors: {
    getName: collection => collection && collection.name,
    getUrl: collection => Urls.collection(collection),
    getIcon: (collection, opts) => {
      const wrappedCollection = collection.collection;
      return getCollectionIcon(wrappedCollection || collection, opts);
    },
  },

  selectors: {
    getForm: getFormSelector,
    getExpandedCollectionsById: createSelector(
      [
        state => state.entities.collections,
        (state, props) => {
          const { list } =
            state.entities.collections_list[
              props ? props.collectionsIdsKey : null
            ] || {};
          return list || [];
        },
        // getUser,
      ],
      (collections, collectionsIds) =>
        getExpandedCollectionsById(collectionsIds.map(id => collections[id])),
    ),
    getInitialCollectionId: createSelector(
      [
        state => state.entities.collections,

        // these are listed in order of priority
        byCollectionIdProp,
        byCollectionIdNavParam,
        byCollectionUrlId,
        byCollectionQueryParameter,

        // defaults
        byCollectionProject,
        () => ROOT_COLLECTION.id,
        getUserPersonalCollectionId,
      ],
      (collections, ...collectionIds) => {
        for (const collectionId of collectionIds) {
          const collection = collections[collectionId];
          if (collection && collection.can_write) {
            return canonicalCollectionId(collectionId);
          }
        }
        return canonicalCollectionId(ROOT_COLLECTION.id);
      },
    ),
  },

  getAnalyticsMetadata([object], { action }, getState) {
    const type = object && getCollectionType(object.parent_id, getState());
    return type && `collection=${type}`;
  },
});

export default Collections;

export function getCollectionIcon(collection, { tooltip = "default" } = {}) {
  if (collection.id === PERSONAL_COLLECTIONS.id) {
    return { name: "group" };
  }
  if (isPersonalCollection(collection)) {
    return { name: "person" };
  }
  const authorityLevel =
    PLUGIN_COLLECTIONS.AUTHORITY_LEVEL[collection.authority_level];
  return authorityLevel
    ? {
        name: authorityLevel.icon,
        color: color(authorityLevel.color),
        tooltip: authorityLevel.tooltips?.[tooltip],
      }
    : { name: "folder" };
}

// API requires items in "root" collection be persisted with a "null" collection ID
// Also ensure it's parsed as a number
export const canonicalCollectionId = (
  collectionId: PseudoCollectionId,
): CollectionId | null =>
  collectionId == null || collectionId === "root"
    ? null
    : parseInt(collectionId, 10);

export function normalizedCollection(collection) {
  if (canonicalCollectionId(collection.id) === null) {
    return ROOT_COLLECTION;
  }
  return collection;
}

export const getCollectionType = (collectionId: string, state: {}) =>
  collectionId === null || collectionId === "root"
    ? "root"
    : collectionId === getUserPersonalCollectionId(state)
    ? "personal"
    : collectionId !== undefined
    ? "other"
    : null;

type UserId = number;

// a "real" collection
type CollectionId = number;

type Collection = {
  id: CollectionId,
  location?: string,
  personal_owner_id?: UserId,
};

// includes "root" and "personal" pseudo collection IDs
type PseudoCollectionId = CollectionId | "root" | "personal";

type ExpandedCollection = {
  id: PseudoCollectionId,
  path: ?(string[]),
  parent: ?ExpandedCollection,
  children: ExpandedCollection[],
  is_personal?: boolean,
};

// given list of collections with { id, name, location } returns a map of ids to
// expanded collection objects like { id, name, location, path, children }
// including a root collection
export function getExpandedCollectionsById(
  collections: Collection[],
  userPersonalCollectionId: ?CollectionId,
): { [key: PseudoCollectionId]: ExpandedCollection } {
  const collectionsById: { [key: PseudoCollectionId]: ExpandedCollection } = {};
  for (const c of collections) {
    collectionsById[c.id] = {
      ...c,
      path:
        c.id === "root"
          ? []
          : c.location != null
          ? ["root", ...c.location.split("/").filter(l => l)]
          : null,
      parent: null,
      children: [],
      is_personal: c.personal_owner_id != null,
    };
  }

  // "Our Analytics"
  collectionsById[ROOT_COLLECTION.id] = {
    ...ROOT_COLLECTION,
    parent: null,
    children: [],
    ...(collectionsById[ROOT_COLLECTION.id] || {}),
  };

  // "My personal collection"
  if (userPersonalCollectionId != null) {
    const personalCollection = collectionsById[userPersonalCollectionId];
    collectionsById[ROOT_COLLECTION.id].children.push({
      ...PERSONAL_COLLECTION,
      id: userPersonalCollectionId,
      parent: collectionsById[ROOT_COLLECTION.id],
      children: personalCollection?.children || [],
      is_personal: true,
    });
  }

  // "Personal Collections"
  collectionsById[PERSONAL_COLLECTIONS.id] = {
    ...PERSONAL_COLLECTIONS,
    parent: collectionsById[ROOT_COLLECTION.id],
    children: [],
    is_personal: true,
  };
  collectionsById[ROOT_COLLECTION.id].children.push(
    collectionsById[PERSONAL_COLLECTIONS.id],
  );

  // iterate over original collections so we don't include ROOT_COLLECTION as
  // a child of itself
  for (const { id } of collections) {
    const c = collectionsById[id];
    // don't add root as parent of itself
    if (c.path && c.id !== ROOT_COLLECTION.id) {
      let parentId;
      // move personal collections into PERSONAL_COLLECTIONS fake collection
      if (c.personal_owner_id != null) {
        parentId = PERSONAL_COLLECTIONS.id;
      } else if (c.path[c.path.length - 1]) {
        parentId = c.path[c.path.length - 1];
      } else {
        parentId = ROOT_COLLECTION.id;
      }

      const parent = parentId == null ? null : collectionsById[parentId];
      c.parent = parent;
      // need to ensure the parent collection exists, it may have been filtered
      // because we're selecting a collection's parent collection and it can't
      // contain itself
      if (parent) {
        parent.children.push(c);
      }
    }
  }

  // remove PERSONAL_COLLECTIONS collection if there are none or just one (the user's own)
  if (collectionsById[PERSONAL_COLLECTIONS.id].children.length <= 1) {
    delete collectionsById[PERSONAL_COLLECTIONS.id];
    collectionsById[ROOT_COLLECTION.id].children = collectionsById[
      ROOT_COLLECTION.id
    ].children.filter(c => c.id !== PERSONAL_COLLECTIONS.id);
  }

  return collectionsById;
}

// Initial collection ID selector helpers

/**
 * @param {ReduxState} state
 * @param {{collectionId?: number}} props
 * @returns {number | undefined}
 */
function byCollectionIdProp(state, { collectionId }) {
  return collectionId;
}

/**
 * @param {ReduxState} state
 * @param {params?: {collectionId?: number}} props
 * @returns {number | undefined}
 */
function byCollectionIdNavParam(state, { params }) {
  return params && params.collectionId;
}

/**
 * Extracts ID from collection URL slugs
 *
 * Example: /collection/14-marketing —> 14
 *
 * @param {ReduxState} state
 * @param {params?: {slug?: string}, location?: {pathname?: string}} props
 * @returns {number | undefined}
 */
function byCollectionUrlId(state, { params, location }) {
  const isCollectionPath =
    params &&
    params.slug &&
    location &&
    Urls.isCollectionPath(location.pathname);
  return isCollectionPath && Urls.extractCollectionId(params.slug);
}

/**
 * Extracts collection ID from query params
 *
 * Example: /some-route?collectionId=14 —> 14
 *
 * @param {ReduxState} state
 * @param {location?: {query?: {collectionId?: number}}} props
 * @returns {number | undefined}
 */
function byCollectionQueryParameter(state, { location }) {
  return location && location.query && location.query.collectionId;
}

function byCollectionProject({ currentUser }, { location }) {
  return getPersonalCollectionId(currentUser, location);
}
