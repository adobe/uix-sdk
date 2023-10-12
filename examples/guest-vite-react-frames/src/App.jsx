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
import { attach, register } from "@adobe/uix-guest";
import React, { useEffect, useMemo, useReducer, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";



const Registrar = () => {
  const [connection, setConnection] = useState(undefined);

  useEffect(() => {
    const init = async () => {
      const connection = await register({
        id: "First frame",
        debug: process.env.NODE_ENV !== "production",
        methods: {
          frame: {
            getUrls: () => ["/frame", "/frame", "/frame"],
          },
        },
      });
      setConnection(connection);
    }
    init().catch((e) => console.log(e));
  }, []);
  return <>Registrar page</>
}

const Display = () => {
  const [connection, setConnection] = useState(undefined);
  const [privateNumber, setPrivateNumber] = useState(undefined)

  useEffect(() => {
    const init = async () => {
      const connection = await attach({
        id: "First frame",
        debug: process.env.NODE_ENV !== "production"
      });
      // setPrivateNumber(await connection.hostConnection.getRemoteApi().frame.getCounter())
      setPrivateNumber(await connection.host.frame.getCounter())
      //setPrivateNumber(await connection.host.frame.getCounter())
    }
    init().catch((e) => console.log(e));
  }, []);
  return <><div style={{width: 4000, height: 400}}>Here is my private number is {privateNumber}</div></>
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Registrar />,
  },
  {
    path: "/frame",
    element: <Display />,
  },
]);

function App() {
  return <RouterProvider router={router} />
}

export default App;
