import { SetMetadata } from '@nestjs/common';

export const API_PAGINATED_RESPONSE_KEY = 'apiPaginatedResponse';

export const ApiPaginatedResponse = (modelName: string) =>
  SetMetadata(API_PAGINATED_RESPONSE_KEY, modelName);
