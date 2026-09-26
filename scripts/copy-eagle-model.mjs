import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const target = join(process.cwd(), 'public/eagle_params.pv');
const modelUrl = 'https://raw.githubusercontent.com/Picovoice/eagle/main/lib/common/eagle_params.pv';

await mkdir(dirname(target), { recursive: true });
const response = await fetch(modelUrl);
if (!response.ok) {
  throw new Error('Failed to download Eagle model: HTTP ' + response.status);
}
const model = Buffer.from(await response.arrayBuffer());
await writeFile(target, model);
console.log('Downloaded Eagle model to public/eagle_params.pv (' + model.length + ' bytes)');
