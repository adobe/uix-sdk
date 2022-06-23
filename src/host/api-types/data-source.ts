import { GuestApi } from "../../common/types";

export interface DataSource<Request, ResultItem> extends GuestApi {
  request(request: Request): Promise<ResultItem[]>;
}
