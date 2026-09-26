import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const source = join(process.cwd(), 'node_modules/@picovoice/eagle-web/lib/common/eagle_params.pv');
const target = join(process.cwd(), 'public/eagle_params.pv');

await mkdir(dirname(target), { recursive: true });
await cp(source, target);
console.log('Copied Eagle model to public/eagle_params.pv');
