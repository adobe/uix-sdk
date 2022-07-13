import React from "react";
import "./NumberFact.css";

const WAITING = "...";
const BUSTED = "(struggling, gasping)";

export function NumberFact({ color, sender, number, getComment }) {
  const [text, setCommentText] = useState(WAITING);
  const classes = new Set();
  classes.add("numberfact");
  if (text === WAITING) {
    classes.add("waiting");
  }
  if (text.startsWith(BUSTED)) {
    classes.add("busted");
  }

  Promise.resolve(getComment(number))
    .then(setCommentText)
    .catch((e) => {
      setCommentText(`${BUSTED} ${e.message}`);
    });

  return (
    <div className={[...classes].join(" ")}>
      <div className="numberfact-sender">
        <span
          className="numberfact-sender-name"
          data-color={color}
        >{`${sender}:`}</span>
      </div>
      <div className="numberfact-message">{text}</div>
    </div>
  );
}
