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
      return {
        ...state,
        theNumber,
        isValid: !problem,
        validationText: problem,
        isSubmitting: !problem,
        comments: new Map(),
      };
    }
    case "comment":
    case "end": {
      return {
        ...state,
        comments: includeComments(state.suggestion, state.comments, [payload]),
        isSubmitting: type !== "end" && state.isSubmitting,
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
