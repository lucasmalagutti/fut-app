import { RefreshControl, ScrollView, type ScrollViewProps } from 'react-native';
import { colors } from '../../theme';

interface RefreshableScrollViewProps extends ScrollViewProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function RefreshableScrollView({
  refreshing,
  onRefresh,
  children,
  ...rest
}: RefreshableScrollViewProps) {
  return (
    <ScrollView
      {...rest}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary[600]]}
          tintColor={colors.primary[600]}
        />
      }
    >
      {children}
    </ScrollView>
  );
}
