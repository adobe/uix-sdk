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
