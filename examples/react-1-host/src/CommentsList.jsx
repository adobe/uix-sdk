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

const senderColors = new Map();
function colorFor(sender) {
  let color = senderColors.get(sender);
  if (!color) {
    color = randomColor();
    senderColors.set(sender, color);
  }
  return color;
}

export default function CommentsList({ comments }) {
  return (
    <Well>
      <Flex direction="column">
        {comments.map(({ sender, message }, i) => {
          const alignment = i % 2 ? "end" : "start";
          return (
            <Flex
              key={i}
              direction="column"
              alignItems={alignment}
              alignSelf={alignment}
            >
              <View>
                <strong style={{ color: colorFor(sender) }}>{sender}</strong>
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
