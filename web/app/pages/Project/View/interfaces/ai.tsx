import { IParams } from './traffic'

interface AIProperty {
  [key: string]: number
}

interface AIResponseObject {
  dv?: AIProperty
  br?: AIProperty
  os?: AIProperty
  lc?: AIProperty
  cc?: AIProperty
  unique?: AIProperty
}

export interface AIResponse {
  next_1_hour?: AIResponseObject
  next_4_hour?: AIResponseObject
  next_8_hour?: AIResponseObject
  next_12_hour?: AIResponseObject
  next_24_hour?: AIResponseObject
  next_72_hour?: AIResponseObject
  next_168_hour?: AIResponseObject
}

export interface AIProcessedResponse {
  next_1_hour?: IParams
  next_4_hour?: IParams
  next_8_hour?: IParams
  next_12_hour?: IParams
  next_24_hour?: IParams
  next_72_hour?: IParams
  next_168_hour?: IParams
}
