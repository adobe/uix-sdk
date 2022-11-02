/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import React, { useRef } from "react";
import {
  ActionButton,
  Flex,
  Form,
  NumberField,
  Grid,
} from "@adobe/react-spectrum";

export function formToJson(form) {
  const formData = new FormData(form);
  const jsonData = {};
  for (const [name, value] of formData) {
    if (Reflect.has(jsonData, name)) {
      const current = jsonData[name];
      jsonData[name] = Array.isArray(current) ? [...current, value] : [value];
    } else {
      jsonData[name] = value;
    }
  }
  return jsonData;
}

export default function NumberSuggestionForm({
  isValid,
  validationText,
  isDisabled,
  onSuggest,
  onReset,
}) {
  const formEl = useRef(null);
  const handleSubmit = () =>
    onSuggest(
      formToJson(
        formEl.current.UNSAFE_getDOMNode
          ? formEl.current.UNSAFE_getDOMNode()
          : formEl.current
      )
    );
  return (
    <Form
      ref={formEl}
      isValid={isValid}
      isDisabled={isDisabled}
      width="size-6000"
      onSubmit={(ev) => {
        ev.preventDefault();
        handleSubmit();
      }}
    >
      <Grid columns={["size-3000"]} rows={["size-700", "size-1200"]} gap={10}>
        <NumberField
          alignSelf="top"
          height="100%"
          autoFocus
          validationState={
            isValid === false ? "invalid" : isValid === true ? "valid" : null
          }
          errorMessage={validationText}
          name="suggestion"
          minValue={0}
          width="100%"
          label="A positive integer, please."
          hideStepper
          step={1}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") handleSubmit();
          }}
        />
        <Flex
          marginTop={30}
          alignSelf="bottom"
          justifyContent="space-between"
          gap={10}
        >
          <ActionButton type="submit">Submit</ActionButton>
          <ActionButton
            isQuiet
            isDisabled={typeof isValid === "undefined"}
            onPress={onReset}
            type="reset"
          >
            Reset
          </ActionButton>
        </Flex>
      </Grid>
    </Form>
  );
}
