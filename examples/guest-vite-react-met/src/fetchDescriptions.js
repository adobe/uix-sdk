export function fetchDescriptions() {
  return fetch("/descriptions.json")
    .then((response) => response.json())
    .then((descriptions) => {
      return descriptions;
    })
    .catch((e) => guest.logger.error("failed to fetch descriptions", e));
}

export function suspendFetchDescriptions() {
  let status = "pending";
  let descriptions;
  let suspender;
  return () => {
    if (!suspender) {
      suspender = fetchDescriptions().then(
        (desc) => {
          status = "success";
          descriptions = desc;
        },
        (e) => {
          status = "failure";
          descriptions = e;
        }
      );
    }
    switch (status) {
      case "success": {
        return descriptions;
      }
      case "failure": {
        throw descriptions;
      }
      default: {
        throw suspender;
      }
    }
  };
}
