/**
 * Geo SDK Demo — Publishing Entities to the Knowledge Graph
 *
 * This script demonstrates how to:
 *   1. Read entity data from JSON files
 *   2. Convert them into Graph operations using the Geo SDK
 *   3. Publish the operations to a space on the Geo testnet
 *
 * Usage:
 *   bun run 02_publish_demo.ts
 *
 * Prerequisites:
 *   - Set DEMO_SPACE_ID in .env to the space you want to publish to
 *   - Set PK_SW to the private key of your smart wallet
 *
 * Re-run safety:
 *   Entity IDs are derived deterministically from the ID_NAMESPACE and entity
 *   name (using derivedUuidFromString from @geoprotocol/grc-20). Re-running
 *   this script is idempotent — CreateEntity is an upsert per GRC-20 spec §3.2.
 */

import * as fs from "fs";
import dotenv from "dotenv";
import { Ops, Position, type Op, ContentIds, GeoTestnetConfig, createGeoClient } from "@geoprotocol/geo-sdk";
import { derivedUuidFromString, formatId } from "@geoprotocol/grc-20/util";
import { printOps, publishOps } from "./src/functions";
import { TYPES, PROPERTIES, ID_NAMESPACE } from "./src/constants";

dotenv.config();

// ─── Stable ID Helper ────────────────────────────────────────────────────────
// Derives a deterministic 32-char hex entity ID from a namespace + name.
// Same inputs always produce the same ID, making re-runs fully idempotent.

function stableId(type: string, name: string): string {
  return formatId(derivedUuidFromString(`${ID_NAMESPACE}:${type}:${name}`));
}

// ─── Property Registry ───────────────────────────────────────────────────────
// Maps JSON field names to their property ID and value type.
// To add a new property for future bounties, add an entry here only.

const VALUE_PROPERTIES: Record<string, { id: string; type: "text" | "date" }> = {
  web_url:      { id: PROPERTIES.web_url,      type: "text" },
  birth_date:   { id: PROPERTIES.birth_date,   type: "date" },
  date_founded: { id: PROPERTIES.date_founded, type: "date" },
};

function extractValues(data: Record<string, any>) {
  const values: any[] = [];
  for (const [field, meta] of Object.entries(VALUE_PROPERTIES)) {
    if (data[field] != null) {
      values.push({ property: meta.id, type: meta.type, value: data[field] });
    }
  }
  return values;
}

// ─── JSON Data Types ──────────────────────────────────────────────────────────

type TopicData = {
  name: string;
  description: string;
};

type PersonData = {
  name: string;
  description: string;
  web_url?: string;
  birth_date?: string;
  topics?: string[];
};

type ProjectData = {
  name: string;
  description: string;
  web_url?: string;
  date_founded?: string;
  topics?: string[];
  avatar_url?: string;
  blocks?: string[];
};

// ─── Main: Build Entities & Publish ──────────────────────────────────────────

async function main() {
  console.log("=== Geo SDK Demo: Publishing Entities ===\n");

  // ── Step 1: Read JSON data ──────────────────────────────────────────────
  console.log("Step 1: Reading entity data from JSON files...");

  const topics: TopicData[] = JSON.parse(
    fs.readFileSync("./data_to_publish/topics.json", "utf-8")
  );
  const people: PersonData[] = JSON.parse(
    fs.readFileSync("./data_to_publish/people.json", "utf-8")
  );
  const projects: ProjectData[] = JSON.parse(
    fs.readFileSync("./data_to_publish/projects.json", "utf-8")
  );

  console.log(`  Loaded: ${topics.length} topics, ${people.length} people, ${projects.length} projects\n`);

  const allOps: Op[] = [];

  // ── Step 2: Create Topic entities ───────────────────────────────────────
  console.log("Step 2: Creating Topic entities...");

  const topicIdsByName: Record<string, string> = {};

  for (const topic of topics) {
    const id = stableId("topic", topic.name);
    const { ops } = Ops.entities.create({
      id,
      name: topic.name,
      description: topic.description,
      types: [TYPES.topic],
    });

    topicIdsByName[topic.name] = id;
    allOps.push(...ops);
    console.log(`  Created topic: "${topic.name}" → ${id}`);
  }

  // ── Step 3: Create Person entities ──────────────────────────────────────
  console.log("\nStep 3: Creating Person entities...");

  const personIdsByName: Record<string, string> = {};

  for (const person of people) {
    const values = extractValues(person);
    const id = stableId("person", person.name);

    const topicRelations = (person.topics || [])
      .filter((t) => topicIdsByName[t])
      .map((t) => ({ toEntity: topicIdsByName[t] }));

    const relations: Record<string, Array<{ toEntity: string }>> = {};
    if (topicRelations.length > 0) {
      relations[PROPERTIES.topics] = topicRelations;
    }

    const { ops } = Ops.entities.create({
      id,
      name: person.name,
      description: person.description,
      types: [TYPES.person],
      values,
      relations,
    });

    personIdsByName[person.name] = id;
    allOps.push(...ops);
    console.log(`  Created person: "${person.name}" → ${id}`);
  }

  // ── Step 4: Create Project entities ─────────────────────────────────────
  console.log("\nStep 4: Creating Project entities...");

  const projectIdsByName: Record<string, string> = {};

  for (const project of projects) {
    const values = extractValues(project);
    const id = stableId("project", project.name);

    const topicRelations = (project.topics || [])
      .filter((t) => topicIdsByName[t])
      .map((t) => ({ toEntity: topicIdsByName[t] }));

    const relations: Record<string, Array<{ toEntity: string }>> = {};
    if (topicRelations.length > 0) {
      relations[PROPERTIES.topics] = topicRelations;
    }

    const { ops } = Ops.entities.create({
      id,
      name: project.name,
      description: project.description,
      types: [TYPES.project],
      values,
      relations,
    });

    projectIdsByName[project.name] = id;
    allOps.push(...ops);
    console.log(`  Created project: "${project.name}" → ${id}`);
  }

  // ── Step 5: Add Text Blocks to entities that have them ─────────────────
  // Blocks are standalone entities attached to a parent via the Blocks
  // relation. Each relation carries a `position` string for ordering.
  console.log("\nStep 5: Adding Text Blocks from JSON data...");

  const lastPosByEntity: Record<string, string> = {};

  for (const project of projects) {
    if (!project.blocks || project.blocks.length === 0) continue;

    const parentId = projectIdsByName[project.name];
    console.log(`  Adding ${project.blocks.length} text blocks to "${project.name}"...`);

    for (let i = 0; i < project.blocks.length; i++) {
      const line = project.blocks[i];
      // Stable block IDs: scoped to parent + block index so they're deterministic
      const blockId = stableId("text-block", `${project.name}:${i}`);

      const { ops: blockOps } = Ops.entities.create({
        id: blockId,
        types: [TYPES.text_block],
        values: [
          {
            property: PROPERTIES.markdown_content,
            type: "text",
            value: line,
          },
        ],
      });
      allOps.push(...blockOps);

      const pos = Position.generateBetween(lastPosByEntity[parentId] ?? null, null);
      lastPosByEntity[parentId] = pos;

      const { ops: relOps } = Ops.relations.create({
        fromEntity: parentId,
        toEntity: blockId,
        type: PROPERTIES.blocks,
        position: pos,
      });
      allOps.push(...relOps);

      const preview = line.length > 50 ? line.slice(0, 50) + "…" : line;
      console.log(`    Block ${blockId}  pos: ${pos}  "${preview}"`);
    }
  }

  // ── 5b: Avatar Images ────────────────────────────────────────────────────
  // createGeoClient().images.create() fetches the image, uploads to IPFS,
  // and returns an Image entity with the IPFS URL, width, and height set.
  const geo = createGeoClient({ network: GeoTestnetConfig });

  for (const project of projects) {
    if (!project.avatar_url) continue;

    const parentId = projectIdsByName[project.name];
    console.log(`\n  Uploading avatar for "${project.name}" to IPFS...`);

    try {
      const { id: imageId, ops: imageOps, cid: imageCid } = await geo.images.create({
        url: project.avatar_url,
        name: `${project.name} Avatar`,
      });
      allOps.push(...imageOps);
      console.log(`  Created image entity: ${imageId} (IPFS CID: ${imageCid})`);

      const { ops: attachImageOps } = Ops.relations.create({
        fromEntity: parentId,
        toEntity: imageId,
        type: ContentIds.AVATAR_PROPERTY,
      });
      allOps.push(...attachImageOps);
      console.log(`  Attached image as avatar`);
    } catch (err: any) {
      console.warn(`  Skipping avatar for "${project.name}": ${err.message}`);
    }
  }

  // ── Step 6: Summary ───────────────────────────────────────────────────────
  console.log(`\n--- Summary ---`);
  console.log(`Total operations generated: ${allOps.length}`);

  const opCounts: Record<string, number> = {};
  for (const op of allOps) {
    opCounts[op.type] = (opCounts[op.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(opCounts)) {
    console.log(`  ${type}: ${count}`);
  }

  // ── Step 7: Publish ───────────────────────────────────────────────────────
  console.log("\nStep 7: Publishing to the Geo knowledge graph...");
  printOps(allOps, "data_to_delete", "demo_publish_ops.json");
  const txHash = await publishOps(allOps, "Demo: publish sample entities");
  console.log(`\nDone! Transaction: ${txHash}`);

  const spaceId = process.env.DEMO_SPACE_ID;
  console.log(`\nVerify your entities at:`);
  console.log(`  https://geobrowser.io/space/${spaceId}`);
  console.log(`\nOr query the API with: bun run 01_api_demo.ts`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
