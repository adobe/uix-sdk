import uixGuest from "@adobe/uix-sdk/guest";

const uix = uixGuest();

uix
  .register({
    interestingNumbers: {
      commentOn(n) {
        const comments = getComments(n);
        record(n, comments);
        return comments;
      },
    },
  })
  .then(() => {
    uix.host.discussion.introduce("I love prime numbers!");
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
