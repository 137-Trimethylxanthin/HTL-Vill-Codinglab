import m11 from './showcase/1.1.json';
import { parseMission, type Mission } from './schema';

export const SHOWCASE: Mission[] = [m11].map(parseMission);
