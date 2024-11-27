/*
 * <license header>
 */


import {Text} from "@adobe/react-spectrum";
import {register} from "@adobe/uix-guest";
import {extensionId} from "./Constants";

function ExtensionRegistration() {
  const init = async () => {
    const guestConnection = await register({
      id: extensionId,
      methods: {
        headerMenu: {
          getButtons() {
            return [
              // YOUR HEADER BUTTONS CODE SHOULD BE HERE
              {
                'id': 'custom-header-button',
                'label': 'Custom Header Button guest',
                'icon': 'OpenIn',
                onClick() {
                  const modalURL = "/index.html#/custom-header-button-modal";
                  console.log("Modal URL: ", modalURL);

                  guestConnection.host.modal.showUrl({
                    title: "Custom Header Button",
                    url: modalURL,
                  });
                },
              },
            ];
          },
        }
      },
    });
  };
  init().catch(console.error);

  return <Text>IFrame for integration with Host (AEM)...</Text>
}

export default ExtensionRegistration;
