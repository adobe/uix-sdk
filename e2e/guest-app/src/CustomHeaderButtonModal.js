/*
 * <license header>
 */

import React, {useEffect, useState} from 'react'
import {attach} from "@adobe/uix-guest"
import {Button, ButtonGroup, Content, defaultTheme, Flex, Provider, Text} from '@adobe/react-spectrum'


import {extensionId} from "./Constants"

export default function CustomHeaderButtonModal () {
  // Fields
  const [guestConnection, setGuestConnection] = useState()

  useEffect(() => {
    console.log('im hereeee');
    (async () => {
      const guestConnection = await attach({ id: extensionId })
      console.log('guest: ', guestConnection)
      setGuestConnection(guestConnection)
    })()
  }, [])

  const onCloseHandler = () => {
    guestConnection.host.modal.close()
  }

  return (
    <Provider theme={defaultTheme} colorScheme='light' id="custom-header-test-modal" UNSAFE_className='CustomHeaderModal'>
      <Content width="100%">
        <Text id="custom-header-test-modal-text">
          Looks like the modal is working fine. This is a custom header button modal.
        </Text>

        <Flex width="100%" justifyContent="end" alignItems="center" marginTop="size-400">
          <ButtonGroup align="end">
            <Button variant="primary" id="custom-header-test-modal-close" onClick={onCloseHandler}>Close</Button>
          </ButtonGroup>
        </Flex>
      </Content>
    </Provider>
  )
}
