import type { CurrentUser } from './auth';

export { attendanceStatusLabels, attendanceStatusTones } from './labels';

export function roleGreeting(user: CurrentUser): string {
  switch (user.role) {
    case 'hr-admin':
      return 'HR desk';
    case 'manager':
      return 'Team view';
    default:
      return 'Hello';
  }
}
