/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import type { Extension } from "@adobe/uix-core";
import type { InstalledExtensions } from "../host";

export interface ExtensionsDifference {
  added: Record<string, Extension["url"] | Extension>;
  removed: Record<string, Extension["url"] | Extension>;
  modified: Record<
    string,
    {
      old: Extension["url"] | Extension;
      new: Extension["url"] | Extension;
    }
  >;
  hasChanges: boolean;
}

interface CompareContext {
  ext1: InstalledExtensions;
  ext2: InstalledExtensions;
  keys1: Set<string>;
  keys2: Set<string>;
}

const classifyKey = (
  result: ExtensionsDifference,
  key: string,
  ctx: CompareContext,
) => {
  const exists1 = ctx.keys1.has(key);
  const exists2 = ctx.keys2.has(key);

  if (!exists1 && exists2) {
    result.added[key] = ctx.ext2[key];
    result.hasChanges = true;
  } else if (exists1 && !exists2) {
    result.removed[key] = ctx.ext1[key];
    result.hasChanges = true;
  } else if (
    exists1 &&
    exists2 &&
    !areExtensionsEqual(ctx.ext1[key], ctx.ext2[key])
  ) {
    result.modified[key] = { new: ctx.ext2[key], old: ctx.ext1[key] };
    result.hasChanges = true;
  }
};

export const compareExtensions = (
  extensions1: InstalledExtensions,
  extensions2: InstalledExtensions,
): ExtensionsDifference => {
  const result: ExtensionsDifference = {
    added: {},
    hasChanges: false,
    modified: {},
    removed: {},
  };

  const keys1 = new Set(Object.keys(extensions1));
  const keys2 = new Set(Object.keys(extensions2));
  const allKeys = new Set([...keys1, ...keys2]);
  const ctx: CompareContext = {
    ext1: extensions1,
    ext2: extensions2,
    keys1,
    keys2,
  };

  for (const key of allKeys) {
    classifyKey(result, key, ctx);
  }

  return result;
};

const compareStrings = (a: string, b: string): number => a.localeCompare(b);

const areExtensionPointsEqual = (ep1: string[], ep2: string[]): boolean => {
  if (ep1.length !== ep2.length) {
    return false;
  }

  const sorted1 = [...ep1].sort(compareStrings);
  const sorted2 = [...ep2].sort(compareStrings);

  return sorted1.every((val, i) => val === sorted2[i]);
};

const areExtensionsEqual = (
  ext1: Extension["url"] | Extension,
  ext2: Extension["url"] | Extension,
): boolean => {
  if (typeof ext1 !== typeof ext2) {
    return false;
  }

  if (typeof ext1 === "string" && typeof ext2 === "string") {
    return ext1 === ext2;
  }

  if (typeof ext1 === "object" && typeof ext2 === "object") {
    if (ext1.id !== ext2.id || ext1.url !== ext2.url) {
      return false;
    }

    return (
      areExtensionPointsEqual(
        ext1.extensionPoints || [],
        ext2.extensionPoints || [],
      ) && deepEqual(ext1.configuration, ext2.configuration)
    );
  }

  return false;
};

const deepEqual = (obj1: unknown, obj2: unknown): boolean => {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== "object" || typeof obj2 !== "object") {
    return false;
  }

  const record1 = obj1 as Record<string, unknown>;
  const record2 = obj2 as Record<string, unknown>;
  const keys1 = Object.keys(record1);
  const keys2 = Object.keys(record2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every(
    (key) => keys2.includes(key) && deepEqual(record1[key], record2[key]),
  );
};

export const areExtensionsDifferent = (
  extensions1: InstalledExtensions,
  extensions2: InstalledExtensions,
): boolean => compareExtensions(extensions1, extensions2).hasChanges;
