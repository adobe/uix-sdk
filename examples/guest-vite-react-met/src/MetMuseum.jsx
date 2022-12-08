import { useEffect, useMemo, useState } from "react";
import { createGuest } from "@adobe/uix-guest";
import { fetchDescriptions } from "./fetchDescriptions";

function MetMuseum() {
  const [uixGuest, setUixGuest] = useState();
  const descriptionsPromise = useMemo(fetchDescriptions);
  useEffect(() => {
    const guest = createGuest({
      id: "The Met",
      debug: true,
    });
    async function getItem(itemId) {
      const descriptions = await descriptionsPromise;
      return descriptions.find((desc) => desc.id === itemId);
    }
    async function show(itemId, locale) {
      const lang = new Intl.Locale(locale || "en-US").language;
      const item = await getItem(itemId, locale);
      if (item) {
        const blurb =
          item.blurbs.find((blurb) => blurb.lang === lang) || item.blurbs.at(0);
        if (blurb) {
          return {
            type: "iframe",
            path: `/show/${itemId}/${lang}`,
            params: {
              blurb,
            },
          };
        }
      }
    }
    guest
      .register({
        previews: {
          async getTitle(itemId, locale) {
            const item = await getItem(itemId, locale);
            return item && item.title;
          },
          show,
        },
      })
      .then(() => setUixGuest(guest))
      .catch((e) => guest.logger.error("failed to initialize", e));
  }, []);

  if (uixGuest) {
    return (
      <div>
        <h1>{`Guest active: ${uixGuest.id}`}</h1>
      </div>
    );
  }
  return (
    <div>
      <h1>Guest loading...</h1>
    </div>
  );
}

export default MetMuseum;
