/**
 * Geo SDK Demo — Deleting All Published Demo Entities
 *
 * Reads the entity IDs that were published by 02_publish_demo.ts and
 * deletes each one by querying its current live state from the API, then
 * building and submitting the necessary delete ops.
 *
 * This approach is correct and robust because it reads ground-truth from
 * the chain rather than trying to parse the local ops file.
 *
 * Usage:
 *   bun run 03_delete_demo.ts
 *
 * Prerequisites:
 *   - Run 02_publish_demo.ts first so data_to_delete/demo_publish_ops.json exists
 *   - Set DEMO_SPACE_ID and PK_SW in .env
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { deleteEntity } from './04_delete_entity.ts';

dotenv.config();

const OPS_FILE = path.join('data_to_delete', 'demo_publish_ops.json');

async function main() {
  console.log("=== Geo SDK Demo: Deleting Published Entities ===\n");

  if (!fs.existsSync(OPS_FILE)) {
    console.error(`Ops file not found: ${OPS_FILE}`);
    console.error("Run 02_publish_demo.ts first to generate it.");
    process.exit(1);
  }

  const spaceId = process.env.DEMO_SPACE_ID;
  if (!spaceId) {
    console.error("DEMO_SPACE_ID not set in .env");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(OPS_FILE, 'utf-8'));

  // Collect unique entity IDs from all createEntity ops (top-level entities only)
  const entityIds: string[] = [
    ...new Set<string>(
      raw
        .filter((op: any) => op.type === "createEntity")
        .map((op: any) => op.id as string)
    )
  ];

  if (entityIds.length === 0) {
    console.log("No entities found in ops file — nothing to delete.");
    return;
  }

  console.log(`Found ${entityIds.length} entities to delete:\n`);
  for (const id of entityIds) {
    console.log(`  ${id}`);
  }
  console.log();

  for (const entityId of entityIds) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`Deleting entity: ${entityId}`);
    try {
      await deleteEntity(entityId, spaceId);
    } catch (err: any) {
      console.error(`  Failed to delete ${entityId}: ${err.message}`);
    }
  }

  console.log("\n=== Delete Demo Complete ===");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
