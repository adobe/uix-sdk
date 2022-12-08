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
import { useExtensions } from "@adobe/uix-host-react";
import React, { useEffect, useMemo, useReducer } from "react";
import { appReducer, initialState } from "./reducer.js";
import NumberSuggestionForm from "./NumberSuggestionForm";
import CommentsList from "./CommentsList";

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const dispatchA = useMemo(
    () =>
      (type, payload = {}) =>
        dispatch({ type, payload }),
    []
  );

  const { extensions } = useExtensions(() => ({
    updateOn: "each",
    requires: {
      interestingNumbers: ["commentOn"],
    },
    provides: {
      discussion: {
        introduce(source, greeting) {
          dispatchA("join", {
            source,
            greeting,
          });
        },
      },
      interestingNumbers: {
        furthermore(source, message) {
          dispatchA("comment", {
            sender: source.id,
            message,
          });
        },
      },
    },
  }));

  useEffect(() => {
    async function getExtensionComments({ id, apis }) {
      try {
        const comments = await apis.interestingNumbers.commentOn(
          state.theNumber
        );
        return comments.map((message) => ({ sender: id, message }));
      } catch (e) {
        throw new Error(`Error in extension "${id}": ${e.stack}`);
      }
    }

    async function discussNumber() {
      try {
        const commentGroups = await Promise.all(
          extensions.map(getExtensionComments)
        );
        dispatchA("end", { comments: commentGroups.flat() });
      } catch (e) {
        dispatchA("error", e);
      }
    }

    if (Reflect.has(state, "theNumber")) discussNumber();
  }, [extensions, state.theNumber]);

  return (
    <Provider theme={defaultTheme} scale="large">
      <View minHeight="100vh" margin={0}>
        <Flex width="size-6000" direction="column" marginX="auto" gap={10}>
          <View marginTop={20}>
            <Heading level="1">Number Discussion</Heading>
          </View>
          <Divider size="S" />
          <View alignSelf="center">
            <NumberSuggestionForm
              isValid={state.isValid}
              validationText={state.validationText}
              isDisabled={state.isSubmitting}
              onSuggest={(formData) => dispatchA("submit", formData)}
              onReset={() => dispatchA("reset")}
            />
          </View>
          <Divider size="S" />
          <View>
            {state.isSubmitting ? (
              <ProgressCircle aria-label="Loading..." isIndeterminate />
            ) : (
              <CommentsList comments={[...state.comments.values()]} />
            )}
          </View>
        </Flex>
      </View>
    </Provider>
  );
}

export default App;
