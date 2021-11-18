import { startup } from './main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

startup(path.join(process.cwd(), 'userdata'), path.join(__dirname, '../..'));
