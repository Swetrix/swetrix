export interface PaginationResultInterface<PaginationEntity> {
  results: PaginationEntity[]
  total: number
  next?: string
  previous?: string
}

export interface PaginationOptionsInterface {
  take?: number
  skip?: number
}
