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

import {
  defaultTheme,
  Provider,
  Flex,
  Heading,
  Divider,
  View,
  ProgressCircle,
} from "@adobe/react-spectrum";
import { useHost, useExtensions, GuestUIFrame } from "@adobe/uix-host-react";
import React, { useCallback, useEffect, useMemo, useReducer, useState } from "react";

function App() {
  const [urls, setUrls] = useState(undefined);
  const { host } = useHost();


  const { extensions } = useExtensions(() => ({
    updateOn: "each",
    requires: {
      frame: ["getUrls"]
    }
  }));

  const fetchUrls = useCallback(async () => {
    if (extensions) {
      const fetchedUrls = await Promise.all(extensions.map(async (extension) => {
        const result = await extension.apis.frame.getUrls();
        return {
          id: extension.id,
          urls: result
        }
      }))
      setUrls(fetchedUrls);
    }
  });

  useEffect(() => {
    fetchUrls().catch(e => console.error(e))
  }, [extensions]);

  const iframeList = useMemo(() => {
    const result = [];
    if (urls) {
      var counter = 0;
      for (const idx in urls) {
        for (const urlIdx in urls[idx].urls) {
          counter++;
          const methods = {
            frame: {
              getCounter: () => urlIdx + "_" + idx
            }
          };
          result.push(<GuestUIFrame key={counter} guestId={urls[idx].id} src={urls[idx].urls[urlIdx]} privateMethods={methods}/>)

        }
      }
    }
    return result;
  }, [urls])

  return (
    <Provider theme={defaultTheme} scale="large">
      <View minHeight="100vh" margin={0}>
        <Flex width="size-6000" direction="column" marginX="auto" gap={10}>
          <View marginTop={20}>
            <Heading level="1">Frames</Heading>
          </View>
          <Divider size="S" />
          <View alignSelf="center">

          </View>
          <Divider size="S" />
          <View>
            {!urls ? (
              <ProgressCircle aria-label="Loading..." isIndeterminate />
            ) : (
              iframeList
            )}
          </View>
        </Flex>
      </View>
    </Provider>
  );
}

export default App;
