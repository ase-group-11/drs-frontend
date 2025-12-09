import React, {ReactNode} from 'react';
import {Text as RNText} from 'react-native';
import {textStyles} from './styles';

type textProps = {
  children: ReactNode;
};

function Text({children}: textProps) {
  return <RNText style={textStyles.base}>{children}</RNText>;
}

export default Text;