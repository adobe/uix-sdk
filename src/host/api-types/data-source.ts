import { GuestApi } from "../../common/types.js";

export interface DataSource<Request, ResultItem> extends GuestApi {
  request(request: Request): Promise<ResultItem[]>;
}
