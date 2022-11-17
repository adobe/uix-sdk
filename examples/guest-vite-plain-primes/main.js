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
 * Extension "Primes Guy" runs as a guest in an invisible iframe.
 * Primes Guy only cares about prime numbers.
 */
import { register } from "@adobe/uix-guest";

async function main() {
  const uix = await register({
    id: "Primes Guy",
    debug: process.env.NODE_ENV !== "production",
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

  function getComments(n) {
    if (isPrime(n)) {
      return [`Among other things, ${n} is prime.`];
    } else {
      const { furthermore } = uix.host.interestingNumbers;
      setTimeout(() => {
        const factors = getPrimeFactors(n);
        const factorList =
          factors.length === 2
            ? `${factors[0]} and ${factors[1]}`
            : `${factors.slice(0, factors.length - 1).join(", ")}, and ${
                factors[factors.length - 1]
              }`;
        setTimeout(
          () => furthermore(`The prime factors of ${n} are ${factorList}.`),
          500
        );
      }, 500);
      return [`${n} is boring, hold on a second.`];
    }
  }

  function getPrimeFactors(n) {
    if (!Number.isSafeInteger(n)) {
      throw new Error(`Come on. "${n} is not even an integer`);
    }
    const factors = [];
    let divisor = 2;

    while (n >= 2) {
      if (n % divisor == 0) {
        factors.push(divisor);
        n = n / divisor;
      } else {
        divisor++;
      }
    }
    return factors;
  }

  function isPrime(num) {
    if (!Number.isSafeInteger(num)) {
      return false;
    }
    const midpoint = Math.sqrt(num);
    let factor = 2;
    while (factor <= midpoint) {
      if (num % factor === 0) {
        return false;
      }
      factor++;
    }
    return true;
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
main().catch((e) => console.error(e));
