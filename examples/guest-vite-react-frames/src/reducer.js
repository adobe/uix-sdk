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

function whyBad(txt) {
  if (txt === "" || (typeof txt !== "number" && !txt)) {
    return [`You have to type a number.`, txt];
  }
  const num = Number(txt.toString().replace(/(\d),(\d)/g, "$1$2"));
  if (Number.isNaN(num)) {
    return [`'${JSON.stringify(txt)}' is not a number.`, txt];
  }
  if (!Number.isSafeInteger(num) || num < 0) {
    return [`The number ${txt} is not a positive integer.`, txt];
  }
  return [null, num];
}

function includeComments(num, existing, added) {
  let comments = existing;
  for (const comment of added) {
    const key = [comment.sender, comment.message, num].join("|||");
    if (!comments.has(key)) {
      comments = comments === existing ? new Map(existing) : comments;
      comments.set(key, comment);
    }
  }
  return comments;
}

export const initialState = {
  participants: {},
  suggestion: "",
  isSubmitting: false,
  validationText: "",
  comments: new Map(),
};

export const appReducer = (state, { type, payload }) => {
  switch (type) {
    case "join": {
      return {
        ...state,
        participants: {
          ...state.participants,
          [payload.source.id]: payload,
        },
      };
    }
    case "submit": {
      const [problem, theNumber] = whyBad(payload.suggestion);
      if (state.theNumber === theNumber) {
        return state;
      }
      return {
        ...state,
        theNumber,
        isValid: !problem,
        validationText: problem,
        isSubmitting: !problem,
        comments: new Map(),
      };
    }
    case "comment": {
      return {
        ...state,
        comments: includeComments(state.suggestion, state.comments, [payload]),
      };
    }
    case "end": {
      return {
        ...state,
        comments: includeComments(
          state.suggestion,
          state.comments,
          payload.comments
        ),
        isSubmitting: false,
        validationText: null,
        isValid: null,
      };
    }
    case "reset": {
      return initialState;
    }
    case "error": {
      return {
        ...state,
        isSubmitting: false,
        isValid: false,
        validationText: payload.message,
      };
    }
  }
};
