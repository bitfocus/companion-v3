import { startup } from './main';
import path from 'path';

startup(path.join(process.cwd(), 'userdata'));
