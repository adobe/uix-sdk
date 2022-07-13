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
    async function getComments() {
      if (state.isSubmitting) {
        try {
          const comments = await Promise.all(
            extensions.map(async ({ id, apis }) => {
              let yourComments;
              try {
                yourComments = await apis.interestingNumbers.commentOn(
                  state.theNumber
                );
              } catch (e) {
                throw new Error(`Error in extension "${id}": ${e.stack}`);
              }
              return yourComments.map((message) => ({
                sender: id,
                message,
              }));
            })
          );
          dispatchA("end", {
            comments: comments.flat(),
          });
        } catch (e) {
          console.error(e);
          dispatchA("error", e);
        }
      }
    }
    getComments();
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
