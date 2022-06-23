import { useEffect, useState } from "react";
import { DataSource } from "../../host/api-types/data-source";
import { useExtensions } from "./useExtensions";

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
  }>({
    providing: {
      dataSource: ["request"],
    },
  });
  const [results, setResults] = useState<ResultItemContainer<ResultItem>[]>([]);
  useEffect(() => {
    for (const [id, source] of Object.entries(extensions)) {
      source.dataSource
        .request(request)
        .then((result) =>
          setResults((currentResult) =>
            currentResult.concat(
              result.map((resultItem) => ({
                source: id,
                data: resultItem,
              }))
            )
          )
        )
        .catch((e) =>
          console.error("Error in %s merging data source %s", blockId, id, e)
        );
    }
  }, [request, extensions]);
  return results;
}
