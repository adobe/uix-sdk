/**
 * Extension "Hypatia" runs as a guest in an invisible iframe.
 * Hypatia was a mathematician and philosopher. She lived in the 4th century.
 */
import { register } from "@adobe/uix-guest";
import * as images from "./images/*.jpg";
import descriptions from "./descriptions.json";

async function init() {
  const extension = await register({
    id: "Kunst",
    debug: true,
    methods: {
      previews: {
        getTitle(itemId) {
          const item = getItem(itemId);
          return item && item.title;
        },
        show(itemId, locale) {
          const lang = new Intl.Locale(locale || "nl-NL").language;
          const item = getItem(itemId);
          if (item) {
            const blurb =
              item.blurbs.find((blurb) => blurb.lang === lang) ||
              item.blurbs.at(0);
            return {
              type: "html",
              html: printBlurb(blurb, itemId),
            };
          }
        },
      },
    },
  });
  function getItem(itemId) {
    return descriptions.find((desc) => desc.id === itemId);
  }
  function printBlurb(blurb, itemId) {
    const imageUrl = new URL(images[itemId + "_detail"], window.location).href;
    extension.logger.debug("produced image url", imageUrl);
    return `
<figure>
  <img style="display: block; margin: 1rem auto; width: 100%;" src="${imageUrl}">
  <caption style="display: block; margin-top: 1rem">${blurb.text}</caption>
</figure>`;
  }

  // for debugging
  function listBlurbs(desc) {
    return `<li><strong>${desc.id}:</strong><ul><li>${desc.blurbs
      .map((blurb) => printBlurb(blurb, desc.id))
      .join("</li><li>")}</li>`;
  }

  document.querySelector("#app").innerHTML = `
    <ul>
    ${descriptions.map(listBlurbs)}
    </ul>
 `;
}

init().catch((e) => {
  console.error(e);
  document.body.innerHTML = `
  <div style="color: red; margin: 1em">
    <h1>Error</h1>
    <pre><code>${e.stack}</code></pre>
  </div>
  `;
});
