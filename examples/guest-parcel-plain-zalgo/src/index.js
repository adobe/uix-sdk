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

/**
 * Extension "Hypatia" runs as a guest in an invisible iframe.
 * Hypatia was a mathematician and philosopher. She lived in the 4th century.
 */
import { register } from "@adobe/uix-guest";
import zalgo from "zalgo-js";
import humanize from "humanize-duration";

const maxMult = 15;
function getComments(n) {
  let ms = Math.pow(n, maxMult / n.toString(8).length);
  return [
    zalgo(
      `it has been ${humanize(ms, {
        round: true,
        conjunction: " and ",
        largest: 1,
      })} ${zalgo(`since ${zalgo(`my awak${zalgo("ening")}`)}`)}`
    ),
  ];
}

const exampleResults = [
  2, 3, 7, 10, 44, 882, 9381, 22995, 237861, 9128791982763912,
].map((num) => `<li>${num}: ${getComments(num)[0]}</li>`);

document.querySelector("#app").innerHTML = `
   <p>Here are some examples of zalgoing numbers.</p>
   <ul>${exampleResults.join("")}</ul>
 `;

register({
  id: "Zalgo",
  debug: process.env.NODE_ENV !== "production",
  methods: {
    interestingNumbers: {
      commentOn(n) {
        // should we say anything?
        if (Math.random() > 0.7) {
          return getComments(n);
        } else {
          return [];
        }
      },
    },
  },
}).then((instance) => {
  instance.logger.log('he arrive');
},(e) => {
  console.error(e);
});
