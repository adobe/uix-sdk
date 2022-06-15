import { Extension, Host } from "../../host";
import { ExtensionContext } from "../extension-context";
import { useEffect, useContext, useState } from "react";

interface ResultItemContainer<Result> {
  source: string;
  data: Result;
}

interface DataSourceHookProps<Request> {
  blockId: string;
  request: Request;
}

export function useDataSources<Request, ResultItem>({
  blockId,
  request,
}: DataSourceHookProps<Request>): ResultItemContainer<ResultItem>[] {
  const host = useContext(ExtensionContext) as Host;
  const [results, setResults] = useState<ResultItemContainer<ResultItem>[]>([]);
  useEffect(() => {
    const sourceList = host.getDataSources<Request, ResultItem>({
      blockId,
    });
    for (const source of sourceList) {
      source
        .request(request)
        .then((result) =>
          setResults((currentResult) =>
            currentResult.concat(
              result.map((resultItem) => ({
                source: source.id,
                data: resultItem,
              }))
            )
          )
        )
        .catch((e) =>
          console.error(
            "Error in %s merging data source %s",
            blockId,
            source.id,
            e
          )
        );
    }
  }, [host.cacheKey]);
  return results;
}
