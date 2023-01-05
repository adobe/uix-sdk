import React, { Suspense, useEffect, useState } from "react";
import { MetMuseumPreview } from "./MetMuseumPreview";
import { attach } from "@adobe/uix-guest";

export default function MetMuseumPreviewPage(props) {
  const [dimensions, setDimensions] = useState(
    document.body.getBoundingClientRect()
  );
  const [language, setLanguage] = useState(props.params.lang)
  useEffect(() => {
    attach({
      id: "The Met",
      debug: true,
    })
    .then(guest => {
	guest.addEventListener("contextchange", ({ detail: { context }}) => {
			setLanguage(context.lang)
	});
	return guest.host.ui.getDimensions()
    })
      .then(setDimensions)
      .catch((e) => {
        console.error("ui attach failed", e);
      });
  }, []);
  return (
    <Suspense fallback={<h1>Loading...</h1>}>
      <MetMuseumPreview {...props.params} lang={language} dimensions={dimensions} />
    </Suspense>
  );
}
