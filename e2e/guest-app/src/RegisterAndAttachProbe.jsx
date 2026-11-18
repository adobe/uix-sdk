import React, { useEffect, useRef, useState } from "react";
import { register, attach } from "@adobe/uix-guest";

export default function RegisterAndAttachProbe() {
  const attempted = useRef(false);
  const [registerStatus, setRegisterStatus] = useState("connecting");
  const [registerError, setRegisterError] = useState("");
  const [attachStatus, setAttachStatus] = useState("idle");
  const [attachError, setAttachError] = useState("");
  const [resizeError, setResizeError] = useState("");

  useEffect(() => {
    const onError = (event) => {
      if (event.message.includes("onIframeResize")) {
        setResizeError(event.message);
      }
    };
    window.addEventListener("error", onError);

    if (!attempted.current) {
      attempted.current = true;
      const params = new URLSearchParams(window.location.hash.split("?")[1]);
      register({
        id: params.get("id"),
        methods: {
          probe: {
            ping: () => "registration-pong",
          },
        },
      })
        // register() returns before the handshake; a real RPC confirms it is live.
        .then((connection) => connection.host.probe.ready())
        .then(() => setRegisterStatus("connected"))
        .catch((error) => {
          setRegisterStatus("error");
          setRegisterError(error.message);
        });
    }

    return () => window.removeEventListener("error", onError);
  }, []);

  const attachInRegistrationFrame = async () => {
    setAttachStatus("connecting");
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    try {
      await attach({ id: params.get("id"), timeout: 5000 });
      setAttachStatus("connected");
    } catch (error) {
      setAttachStatus("rejected");
      setAttachError(error.message);
    }
  };

  return (
    <div>
      <p id="register-status">{registerStatus}</p>
      <p id="register-error">{registerError}</p>
      <button
        id="attach-in-registration-frame"
        disabled={registerStatus !== "connected" || attachStatus !== "idle"}
        onClick={attachInRegistrationFrame}
      >
        Attach in the same registration iframe
      </button>
      <p id="attach-status">{attachStatus}</p>
      <p id="attach-error">{attachError}</p>
      <p id="resize-error">{resizeError}</p>
    </div>
  );
}
