export interface ApiHttpMethodMap {
  GET: true;
  POST: true;
  PUT: true;
  PATCH: true;
  DELETE: true;
}

export interface ApiRequestTabMap {
  params: true;
  headers: true;
  body: true;
}

export { ApiRequestBuilder } from './ApiRequestBuilder';
export type {
  ApiHttpMethod,
  ApiKeyValueRow,
  ApiRequestBuilderProps,
  ApiRequestPayload,
  ApiRequestTab,
  ApiResponseSnapshot,
} from './ApiRequestBuilder';
