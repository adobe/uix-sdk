import type { NamespacedApis, RequiredMethodsByName } from "../../common/types";
import { ExtensionContext } from "../extension-context";
import { useContext } from "react";

export interface UseExtensionsParams<T extends NamespacedApis> {
  providing: RequiredMethodsByName<T>;
  /**
   * Optional string to send to extension, to help identify which page, section
   * or functionality type the host is calling the extension for.
   *
   * Use this instead of adding multiple namespaces with the same API but
   * different names, such as expecting both "autocompleteContacts" and
   * "autocompleteSegments" APIs.
   */
  tag?: string;
}

export interface UseExtensionsResult<T> {
  extensions: Record<string, T>;
}

export function useExtensions<T extends NamespacedApis = NamespacedApis>({
  providing,
  tag,
}: UseExtensionsParams<T>): UseExtensionsResult<T> {
  const host = useContext(ExtensionContext);
  const extensions: Record<string, T> = {};

  for (const [id, extension] of Object.entries(host.guests)) {
    const hasRequestedTags = tag ? extension.hasTag(tag) : true;
    if (extension.provides(providing) && hasRequestedTags) {
      extensions[id] = extension.interfaces as T;
    }
  }

  return { extensions };
}
const { extensions } = useExtensions<{
  autocomplete: { onTextToken: (text: string) => Promise<string[]> };
}>({
  providing: {
    autocomplete: ["onTextToken"],
  },
});

extensions.extensionId.autocomplete.onTextToken("askldj");
