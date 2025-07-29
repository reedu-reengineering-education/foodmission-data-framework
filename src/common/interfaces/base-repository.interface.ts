export interface BaseRepository<T, CreateDto, UpdateDto> {
  findAll(options?: FindAllOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
  count(where?: any): Promise<number>;
}

export interface FindAllOptions {
  skip?: number;
  take?: number;
  where?: any;
  orderBy?: any;
  include?: any;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
