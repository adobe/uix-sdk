import { useEffect, useState } from "react";
import { DataSource } from "../../host/api-types/data-source.js";
import { useExtensions } from "./useExtensions.js";

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
  const { extensions } = useExtensions<{
    dataSource: DataSource<Request, ResultItem>;
  }>(() => ({
    requires: {
      dataSource: ["request"],
    },
  }));
  const [results, setResults] = useState<ResultItemContainer<ResultItem>[]>([]);
  useEffect(() => {
    for (const extension of extensions) {
      extension.apis.dataSource
        .request(request)
        .then((result) =>
          setResults((currentResult) =>
            currentResult.concat(
              result.map((resultItem) => ({
                source: extension.id,
                data: resultItem,
              }))
            )
          )
        )
        .catch((e) =>
          console.error(
            "Error in %s merging data source %s",
            blockId,
            extension.id,
            e
          )
        );
    }
  }, [request, extensions]);
  return results;
}
