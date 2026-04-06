import { SettingsPage } from '@/features/settings/components/SettingsPage';
import type { BoxControllerState } from '@/types/box';

type TabAdvancedProps = Pick<BoxControllerState, 'config' | 'handleToggle' | 'handleChange'>;

export function TabAdvanced(props: TabAdvancedProps) {
  return <SettingsPage {...props} />;
}
