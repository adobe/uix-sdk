import { tokenizeAttrValues, mergeAttrValues } from "./attribute-normalizers";

const joined = "one two red blue";
const list = ["one", "two", "red", "blue"];

describe("tokenizeAttributes", () => {
  it("splits space-separated strings", () =>
    expect(tokenizeAttrValues(joined)).toEqual(list));
  it("passes string lists through", () =>
    expect(tokenizeAttrValues(list)).toEqual(list));
});

describe("mergeAttrValues", () => {
  it("merges multiple arguments into a single deduplicated list", () =>
    expect(
      mergeAttrValues(
        list,
        joined,
        "red red",
        "blue red",
        "fish",
        ["two", "fish"],
        joined
      )
    ).toEqual(list.concat("fish")));
});
