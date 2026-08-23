// rotate-uuid.js
// Automatically rotates the client_id in config.json on a schedule, so you
// never have to visit uuidgenerator.net manually again.
//
// Run this as a step in the GitHub Action BEFORE the step that generates
// output/plutotv_us.m3u8, so the freshly generated playlist always reflects
// whatever client_id is currently in config.json.
//
// Rotation is time-gated (not every run) using a small marker stored inside
// config.json itself, so re-running the workflow frequently doesn't churn
// the identity constantly.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_FILE = path.join(__dirname, 'config.json');

// How often to rotate, in days. Adjust to taste — e.g. 7 for weekly, 14 for
// every two weeks. Pluto's flagging behavior isn't documented, so this is a
// starting point you can tune based on how often you were manually rotating.
const ROTATE_EVERY_DAYS = 1;

function main() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(`config.json not found at ${CONFIG_FILE}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

  const lastRotated = config._client_id_rotated_at
    ? new Date(config._client_id_rotated_at)
    : null;

  const daysSinceRotation = lastRotated
    ? (Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (daysSinceRotation < ROTATE_EVERY_DAYS) {
    console.log(
      `client_id last rotated ${daysSinceRotation.toFixed(1)} days ago ` +
      `(threshold: ${ROTATE_EVERY_DAYS}). Skipping rotation.`
    );
    return;
  }

  const oldId = config.clientID;
  const newId = crypto.randomUUID();

  config.clientID = newId;
  config._client_id_rotated_at = new Date().toISOString();

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');

  console.log(`Rotated client_id: ${oldId} -> ${newId}`);
}

main();
