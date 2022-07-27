import type { GuestApi } from "@adobe/uix-core";

export interface DataSource<Request, ResultItem> extends GuestApi {
  request(request: Request): Promise<ResultItem[]>;
}
