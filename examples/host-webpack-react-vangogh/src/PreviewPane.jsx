import { GuestUIFrame } from "@adobe/uix-host-react";
import React, { useRef } from "react";

export function PreviewPane(props) {
  const { uiConfig, guestId } = props;
  const iframeRef = useRef();
  if (!uiConfig) {
    return (
      <p>{`Sorry, ${guestId} has no additional information about this painting!`}</p>
    );
  }
  switch (uiConfig.type) {
    case "html": {
      return <div dangerouslySetInnerHTML={{ __html: uiConfig.html }} />;
    }
    case "iframe": {
      return (
        <GuestUIFrame
          ref={iframeRef}
          guestId={guestId}
          src={uiConfig.path}
          methods={{
            ui: {
              getDimensions() {
                const rect = iframeRef.current.getBoundingClientRect();
                return rect.toJSON();
              },
            },
          }}
        />
      );
    }
    default: {
      return <h3>{`Unsupported guest UI type "${uiConfig.type}"`}</h3>;
    }
  }
}
