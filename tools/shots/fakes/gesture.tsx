// react-native-gesture-handler and react-native-reorderable-list, as plain views.
import { FlatList, View } from 'react-native';

export const GestureHandlerRootView = View;
export default function ReorderableList(props: any) {
  return <FlatList {...props} />;
}
export const useIsActive = () => false;
export const useReorderableDrag = () => () => {};
