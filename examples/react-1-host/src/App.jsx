import {
  defaultTheme,
  Provider,
  Flex,
  Heading,
  Divider,
  View,
  ProgressCircle,
} from "@adobe/react-spectrum";
import { useExtensions } from "@adobe/uix-sdk/react";
import React, { useEffect, useMemo, useReducer } from "react";
import { appReducer, initialState } from "./reducer";
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
    updateOn: "all",
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
    if (!state.isSubmitting) {
      return;
    }
    Promise.all(
      extensions.map(({ id, apis }) =>
        apis.interestingNumbers
          .commentOn(state.theNumber)
          .then((comments) =>
            comments.map((message) => ({
              sender: id,
              message,
            }))
          )
          .catch((e) => {
            throw new Error(`Error in extension "${id}": ${e.stack}`);
          })
      )
    )
      .then((comments) => dispatchA("end", { comments: comments.flat() }))
      .catch((e) => {
        console.error(e);
        dispatchA("error", e);
      });
  }, [extensions, state.isSubmitting, state.theNumber]);

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
