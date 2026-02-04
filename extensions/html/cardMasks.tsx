import React from 'react';
import { MaskDefinition, buildAutoMask } from 'protolib/components/GenericMask';
import coreContext from './coreContext';

export default coreContext._registry.map(c => buildAutoMask(c));