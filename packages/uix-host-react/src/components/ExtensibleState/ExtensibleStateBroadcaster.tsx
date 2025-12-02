import { useContext, useEffect } from "react";
import { ExtensibleStateProviderContext } from "./ExtensibleStateProviderContext";
import { useHost } from "../../hooks";
import { Port, UiFrameType } from "@adobe/uix-host";

type RemoteApiType = {
  apis: {
    broadcastToUiFrames: (prop: string, value: unknown) => void;
  };
};

export const ExtensibleStateBroadcaster = (): null => {
  const { storeManager } = useContext(ExtensibleStateProviderContext);
  const { host } = useHost();

  useEffect(() => {
    if (host && storeManager) {
      storeManager.subscribe(
        "*",
        (value: unknown, metadata: { subscriptionProp: string }) => {
          host.guests.forEach((guest: Port): void => {
            guest.uiFrames.forEach((frame: UiFrameType) => {
              const remoteApi =
                frame.connection.getRemoteApi() as RemoteApiType;
              remoteApi.apis.broadcastToUiFrames(
                metadata.subscriptionProp,
                value
              );
            });
          });
        }
      );
    }
  }, [host, storeManager]);

  return null;
};
