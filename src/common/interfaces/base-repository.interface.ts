export interface BaseRepository<T, CreateDto, UpdateDto, TWhereInput = never> {
  findAll(options?: FindAllOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: TWhereInput): Promise<number>;
}

export interface FindAllOptions<
  TWhereInput = never,
  TOrderBy = never,
  TInclude = never,
> {
  skip?: number;
  take?: number;
  where?: TWhereInput;
  orderBy?: TOrderBy;
  include?: TInclude;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
