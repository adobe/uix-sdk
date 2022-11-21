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

async function main() {
  const uix = await AdobeUIXGuest.register({
    id: "Hypatia",
    debug: true,
    methods: {
      interestingNumbers: {
        commentOn(n) {
          const comments = getComments(n);
          record(n, comments);
          return comments;
        },
      },
    },
  });

  let receivedLargeNumbers = 0;

  function getComments(n) {
    if (receivedLargeNumbers === 3) {
      return ["NOLO AMPLIVS VIDERE DE NVMERIS STVLTORVM TUORVM 😤"];
    }
    const comments = [];
    if (n > 9000) {
      receivedLargeNumbers++;
      const roman = convertToRoman(Math.floor(n / 1000));
      comments.push(
        roman.length > 20
          ? "NON SCRIBO QVOD VITA BREVIS"
          : `NVMERVS ILLE ERIT PROPE (${roman})`,
        "ECCE NIMIUM MAGNVS EST"
      );
      if (receivedLargeNumbers === 2) {
        setTimeout(
          () => uix.host.interestingNumbers.furthermore("DESINE HOS MIHI DARE"),
          750
        );
      }
    } else {
      comments.push([`NVMERVS ILLE ERIT ${convertToRoman(n)}`]);
    }
    return comments;
  }

  function convertToRoman(num) {
    var roman = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1,
    };
    var str = "";

    for (var i of Object.keys(roman)) {
      var q = Math.floor(num / roman[i]);
      num -= q * roman[i];
      str += i.repeat(q);
    }

    return str;
  }
  const received = [];
  function record(number, comments) {
    received.push(`<dt><strong>${number}:</strong></dt>
  ${comments.map((comment) => `<dd>${comment}</dd>`)}</dt>`);

    document.querySelector("#app").innerHTML = `
  <p>I've received ${received.length} numbers:</p>
  <dl>
  ${comments.join("")}
  </dl>
`;
  }

  document.querySelector("#app").innerHTML = `
  <p>I haven't received a number yet.</p>
`;
}

main().catch((e) => {
  console.error(e);
});
