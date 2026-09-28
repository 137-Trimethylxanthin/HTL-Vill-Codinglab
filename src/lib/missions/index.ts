import m11 from './showcase/1.1.json';
import m12 from './showcase/1.2.json';
import m13 from './showcase/1.3.json';
import m21 from './showcase/2.1.json';
import m22 from './showcase/2.2.json';
import m31 from './showcase/3.1.json';
import m32 from './showcase/3.2.json';
import { parseMission, type Mission } from './schema';

export const SHOWCASE: Mission[] = [m11, m12, m13, m21, m22, m31, m32].map(parseMission);
