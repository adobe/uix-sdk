import logo from './logo.svg';
import './App.css';
import {GuestUIFrame, useExtensions} from "@adobe/uix-host-react";
import {useCallback, useEffect, useState} from "react";
import {
    ActionButton, Button,
    ButtonGroup,
    Content,
    Dialog,
    DialogTrigger,
    Divider,
    Header,
    Heading
} from "@adobe/react-spectrum";

function App() {
    const [buttonData, setButtonData] = useState([]);
    const [modal, setModal] = useState({
        title: '',
        url: ''
    })

    const { extensions } = useExtensions(() => ({
        updateOn: "all",
        requires: {
            headerMenu: ["getButtons"]
        },
        provides: {
            modal: {
                showUrl: (source, data) => {
                    const url = source.url.origin + data.url;
                    console.log('modal data: ', source, data);
                    setModal({
                        open: true,
                        title: data.title,
                        url: url
                    })
                },
                close: () => {
                    console.log('close modal');
                    setModal({...modal, open: false});
                }
            }
        }
    }));
    console.log('extensions: ', extensions);

    const fetchUrls = useCallback(async () => {
        if (extensions) {
            const fetchedUrls = await Promise.all(extensions.filter(extension => extension.id === 'cf-admin-all-points').map(async (extension) => {
                const result = await extension.apis.headerMenu.getButtons();
                return {
                    id: extension.id,
                    data: result
                }
            }))
            console.log('data: ', fetchedUrls)
            if (fetchedUrls.length > 0) {
                const buttons = fetchedUrls[0].data;
                setButtonData(buttons);
            }
        }
    }, [extensions]);

    useEffect(() => {
        fetchUrls().catch(e => console.error(e))

    }, [fetchUrls]);

  return (
      <div className="App">
          <header className="App-header">
              <img src={logo} className="App-logo" alt="logo"/>

              <div>
                  {buttonData.length > 0 && buttonData.map((button) => {
                      return (
                          <DialogTrigger key={button.id} isDismissable>
                              <ActionButton marginTop="2rem" id={button.id} onPress={() => button.onClick()}>{button.label}</ActionButton>
                                  <Dialog id={button.id + '-dialog'}>
                                      <Heading>{modal.title}</Heading>
                                      <Header>Connection status: Connected</Header>
                                      <Divider />
                                      <Content>
                                          <GuestUIFrame id={button.id +  '-modal'} guestId="cf-admin-all-points" src={modal.url} />
                                      </Content>
                                  </Dialog>
                          </DialogTrigger>
                      );
                  })}

              </div>
          </header>

      </div>
  );
}

export default App;
