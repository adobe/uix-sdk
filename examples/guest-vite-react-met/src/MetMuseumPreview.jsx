import React from "react";
import ReactMarkdown from "react-markdown";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { suspendFetchDescriptions } from "./fetchDescriptions";
import "./MetMuseumPreview.css";

const fetchDescriptions = suspendFetchDescriptions();

export function MetMuseumPreview({ painting, lang, dimensions }) {
  const descriptions = fetchDescriptions();
  const description = descriptions.find((desc) => desc.id === painting);
  const blurb = description.blurbs.find((b) => b.lang === lang) || description.blurbs[0];
  console.log('MetMuseumPreview received dimensions', dimensions);
  return (
    <figure style={{ display: "flex" }}>
      {description.image && (
        <Zoom>
          <img
            style={{ maxHeight: "100%", maxWidth: "100%", flex: 1 }}
            src={description.image}
          ></img>
        </Zoom>
      )}
      {blurb && (<figcaption>
        <ReactMarkdown>{blurb.text}</ReactMarkdown>
      </figcaption>)}
    </figure>
  );
}

export default MetMuseumPreview;
