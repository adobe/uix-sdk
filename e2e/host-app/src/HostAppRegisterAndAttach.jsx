import { useState } from "react";
import { Extensible, useExtensions } from "@adobe/uix-host-react";

const provider = async () => ({
  "register-and-attach": {
    id: "register-and-attach",
    url: "http://localhost:3002#/register-and-attach?id=register-and-attach",
  },
});

function RegistrationProbe() {
  const [pingStatus, setPingStatus] = useState("idle");
  const [pingResult, setPingResult] = useState("");
  const [pingError, setPingError] = useState("");
  const { extensions = [] } = useExtensions(() => ({
    requires: { probe: ["ping"] },
    provides: { probe: { ready: () => true } },
  }));

  const ping = async () => {
    setPingStatus("pending");
    setPingResult("");
    setPingError("");
    try {
      const result = await extensions[0].apis.probe.ping();
      setPingResult(result);
      setPingStatus("ok");
    } catch (error) {
      setPingError(error.message);
      setPingStatus("error");
    }
  };

  return (
    <div>
      <p id="extension-count">{extensions.length}</p>
      <button
        id="ping-registration"
        disabled={!extensions.length}
        onClick={ping}
      >
        Ping registration connection
      </button>
      <p id="registration-ping-status">{pingStatus}</p>
      <p id="registration-ping-result">{pingResult}</p>
      <p id="registration-ping-error">{pingError}</p>
    </div>
  );
}

export default function HostAppRegisterAndAttach() {
  return (
    <Extensible debug={true} extensionsProvider={provider}>
      <RegistrationProbe />
    </Extensible>
  );
}
