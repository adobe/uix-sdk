/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { createServer } from "http";

export function startRegistry(endpoint, guests) {
  const registryUrl = new URL(endpoint);
  const port = registryUrl.port || 0;
  const registry = createServer((req, res) => {
    const url = new URL(req.url, endpoint);
    let qualifyingGuests = guests;
    // Keywords are optional. Calling the registry with a "keywords=" parameter
    // will cause the registry to filter its response for only the guests which
    // have declared those keywords in package.json "keywords". If the guest
    // package.json doesn't have a "keywords" array, then it won't be excluded.
    // If the guest package.json declares an empty "keywords" array, then it
    // will be excluded from any registry call that has a "keywords" parameter.
    // Otherwise, all guests will be returned.
    const keywords = url.searchParams.get("keywords");
    if (keywords) {
      const tagFilter = keywords.split(",");
      qualifyingGuests = guests.filter(
        ({ keywords }) =>
          !keywords || tagFilter.every((tag) => keywords.includes(tag))
      );
    }

    res.writeHead(200, {
      "Content-Type": "text/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(JSON.stringify(qualifyingGuests, null, 2));
    res.end();
  });

  return new Promise((resolve, reject) => {
    try {
      registry.on("error", reject);
      registry.listen(Number(port), registryUrl.hostname, () =>
        resolve(registry)
      );
    } catch (e) {
      reject(e);
    }
  });
}
