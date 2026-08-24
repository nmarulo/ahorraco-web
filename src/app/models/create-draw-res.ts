import { TurnRes } from '@app/models/turn-res';

export interface CreateDrawRes {
  readonly turns: TurnRes[];
}
