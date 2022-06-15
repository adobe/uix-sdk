export interface DataSource<Request, ResultItem> {
  id: string;
  request(request: Request): Promise<ResultItem[]>;
}
