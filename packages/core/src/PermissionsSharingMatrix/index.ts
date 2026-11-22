export interface PosixScopeKeyMap {
  owner: true;
  group: true;
  public: true;
}

export interface PosixBitKeyMap {
  read: true;
  write: true;
  execute: true;
}

export interface CloudShareAccessLevelMap {
  restricted: true;
  viewer: true;
  commenter: true;
  editor: true;
}

export interface CloudShareExpiryMap {
  '7d': true;
  '30d': true;
  never: true;
}

export {
  PermissionsSharingMatrix,
  calculatePosixOctal,
  calculatePosixSymbolic,
  calculatePosixTripletOctal,
  calculatePosixTripletSymbolic,
} from './PermissionsSharingMatrix';
export type {
  CloudShareAccessLevel,
  CloudShareExpiry,
  PermissionsSharingMatrixProps,
  PermissionsSharingState,
  PosixBitKey,
  PosixPermissionsState,
  PosixScopeKey,
  PosixTriplet,
} from './PermissionsSharingMatrix';
