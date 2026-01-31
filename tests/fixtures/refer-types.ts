const status = ['pending', 'active', 'completed'] as const;
type Status = (typeof status)[number];

export class Task {
  id: string;
  status: Status;
  priority: 1 | 2 | 3;
}
