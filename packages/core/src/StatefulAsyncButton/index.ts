export interface StatefulAsyncButtonSizeMap {
  sm: true;
  md: true;
  lg: true;
}

export interface StatefulAsyncButtonStateMap {
  idle: true;
  loading: true;
  success: true;
  error: true;
}

export { StatefulAsyncButton } from './StatefulAsyncButton';
export type {
  AsyncButtonSize,
  AsyncButtonState,
  StatefulAsyncButtonProps,
} from './StatefulAsyncButton';
