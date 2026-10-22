/**
 * Export downloads. Each reads the data afresh from the server, so a file
 * always holds the database as it is at the moment of the click.
 */
import { downloadFile } from '../lib/export.js';
import { readNodes } from './data.js';
import {
    CSV_MIME,
    JSON_MIME,
    SNAPSHOT_NODES,
    buildSnapshot,
    datedFileName,
    nodeCsv,
    nodeFileName,
    nodeJson,
} from './files.js';

/**
 * Downloads one node as CSV.
 * @param {string} name 'ratings', 'leaderboard', 'rankings' or 'sessions'
 * @returns {Promise<string>} the file name
 */
export async function downloadNodeCsv(name) {
    const { [name]: value } = await readNodes([name]);
    const file = datedFileName(name, 'csv', new Date());
    downloadFile(file, nodeCsv(name, value), CSV_MIME);
    return file;
}

/**
 * Downloads one node as JSON, named for analysis/fetch-data.sh --from.
 * @param {string} name
 * @returns {Promise<string>} the file name
 */
export async function downloadNodeJson(name) {
    const { [name]: value } = await readNodes([name]);
    const file = nodeFileName(name);
    downloadFile(file, nodeJson(value), JSON_MIME);
    return file;
}

/**
 * Downloads the full snapshot of every readable node.
 * @returns {Promise<string>} the file name
 */
export async function downloadSnapshot() {
    const nodes = await readNodes(SNAPSHOT_NODES);
    const exportedAt = new Date();
    const file = datedFileName('snapshot', 'json', exportedAt);
    downloadFile(
        file,
        `${JSON.stringify(buildSnapshot(nodes, { exportedAt }), null, 2)}\n`,
        JSON_MIME
    );
    return file;
}
