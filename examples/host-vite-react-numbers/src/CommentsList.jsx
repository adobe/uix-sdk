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

import { Flex, Text, View, Well } from "@adobe/react-spectrum";
import React from "react";

const colors = ["#4D30A6", "#AB0900", "#0039AB", "#F29018", "#00A11D"];
let colorsLeft = [...colors];

const randomColor = () => {
  if (colorsLeft.length === 0) {
    colorsLeft = [...colors];
  }
  return colorsLeft.splice(Math.floor(Math.random() * colorsLeft.length), 1);
};

let lastRight = true;
const nextAlignment = () => {
  lastRight = !lastRight;
  return lastRight ? "start" : "end";
};

const senderFormats = new Map();
function formatFor(sender) {
  let format = senderFormats.get(sender);
  if (!format) {
    format = {
      color: randomColor(),
      alignment: nextAlignment(),
    };
    senderFormats.set(sender, format);
  }
  return format;
}

export default function CommentsList({ comments }) {
  return (
    <Well>
      <Flex direction="column">
        {comments.map(({ sender, message }, i) => {
          const { alignment, color } = formatFor(sender);
          return (
            <Flex
              key={i}
              direction="column"
              alignItems={alignment}
              alignSelf={alignment}
            >
              <View>
                <strong style={{ color }}>{sender}</strong>
              </View>
              <View>
                <Text>{message}</Text>
              </View>
            </Flex>
          );
        })}
      </Flex>
    </Well>
  );
}
