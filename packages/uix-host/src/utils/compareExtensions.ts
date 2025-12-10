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

import { Extension } from "@adobe/uix-core";
import { InstalledExtensions } from "../host";

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

export function compareExtensions(
  extensions1: InstalledExtensions,
  extensions2: InstalledExtensions
): ExtensionsDifference {
  const result: ExtensionsDifference = {
    added: {},
    removed: {},
    modified: {},
    hasChanges: false,
  };

  const keys1 = new Set(Object.keys(extensions1));
  const keys2 = new Set(Object.keys(extensions2));
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const exists1 = keys1.has(key);
    const exists2 = keys2.has(key);

    if (!exists1 && exists2) {
      result.added[key] = extensions2[key];
      result.hasChanges = true;
    } else if (exists1 && !exists2) {
      result.removed[key] = extensions1[key];
      result.hasChanges = true;
    } else if (exists1 && exists2) {
      const ext1 = extensions1[key];
      const ext2 = extensions2[key];

      if (!areExtensionsEqual(ext1, ext2)) {
        result.modified[key] = {
          old: ext1,
          new: ext2,
        };
        result.hasChanges = true;
      }
    }
  }

  return result;
}

function areExtensionsEqual(
  ext1: Extension["url"] | Extension,
  ext2: Extension["url"] | Extension
): boolean {
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

    const ep1 = ext1.extensionPoints || [];
    const ep2 = ext2.extensionPoints || [];

    if (ep1.length !== ep2.length) {
      return false;
    }

    const sortedEp1 = [...ep1].sort();
    const sortedEp2 = [...ep2].sort();

    for (let i = 0; i < sortedEp1.length; i++) {
      if (sortedEp1[i] !== sortedEp2[i]) {
        return false;
      }
    }

    return deepEqual(ext1.configuration, ext2.configuration);
  }

  return false;
}

function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== "object" || typeof obj2 !== "object") {
    return false;
  }

  const keys1 = Object.keys(obj1 as Record<string, unknown>);
  const keys2 = Object.keys(obj2 as Record<string, unknown>);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }

    if (
      !deepEqual(
        (obj1 as Record<string, unknown>)[key],
        (obj2 as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }

  return true;
}

export function areExtensionsDifferent(
  extensions1: InstalledExtensions,
  extensions2: InstalledExtensions
): boolean {
  return compareExtensions(extensions1, extensions2).hasChanges;
}
