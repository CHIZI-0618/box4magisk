import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import type { BoxControllerState } from '@/types/box';

type TabHomeProps = Pick<BoxControllerState, 'status' | 'config' | 'actionLoading' | 'coreInfo' | 'handleServiceAction' | 'handleChange' | 'handleToggle' | 'handleToggleAutoStart'>;

export function TabHome(props: TabHomeProps) {
  return <DashboardPage {...props} />;
}
