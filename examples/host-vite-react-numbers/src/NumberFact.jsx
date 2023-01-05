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

import React from "react";

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
