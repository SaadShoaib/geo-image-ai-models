import { Graph, type Op } from '@geoprotocol/geo-sdk';
import { gql, printOps, publishOps } from './src/functions.ts';

export async function deleteEntity(entityId: string, spaceId: string) {
  console.log(`\nQuerying entity ${entityId} in space ${spaceId}...`);

  const data = await gql(`{
    values(filter: {
      entityId: { is: "${entityId}" }
      spaceId: { is: "${spaceId}" }
    }) {
      propertyId
      propertyEntity { name }
    }
    relations(filter: {
      fromEntityId: { is: "${entityId}" }
      spaceId: { is: "${spaceId}" }
    }) {
      id
      typeId
      toEntity { name }
      typeEntity { name }
    }
  }`);

  const values: Array<{ propertyId: string; propertyEntity: { name: string } | null }> = data.values ?? [];
  const relations: Array<{ id: string; typeId: string; toEntity: { name: string } | null; typeEntity: { name: string } | null }> = data.relations ?? [];

  const uniquePropertyIds = [...new Set(values.map(v => v.propertyId))];

  console.log(`\nFound ${values.length} values across ${uniquePropertyIds.length} unique properties:`);
  for (const pid of uniquePropertyIds) {
    const name = values.find(v => v.propertyId === pid)?.propertyEntity?.name ?? pid;
    console.log(`  - ${name} (${pid})`);
  }

  console.log(`\nFound ${relations.length} relations:`);
  for (const r of relations) {
    const typeName = r.typeEntity?.name ?? r.typeId;
    const toName = r.toEntity?.name ?? '(unknown)';
    console.log(`  - ${typeName} → ${toName} (${r.id})`);
  }

  const ops: Op[] = [];

  if (uniquePropertyIds.length > 0) {
    const result = Graph.updateEntity({
      id: entityId,
      unset: uniquePropertyIds.map(p => ({ property: p })),
    });
    ops.push(...result.ops);
  }

  for (const r of relations) {
    const result = Graph.deleteRelation({ id: r.id });
    ops.push(...result.ops);
  }

  if (ops.length === 0) {
    console.log('\nNo properties or relations found — nothing to delete.');
    return;
  }

  console.log(`\nGenerated ${ops.length} delete ops.`);
  printOps(ops, '.', 'delete_entity_ops.txt');

  const txHash = await publishOps(ops, `Delete entity ${entityId}`, spaceId);
  return txHash;
}

// ─── Example usage ──────────────────────────────────────────────────────────
// Replace these with the entity and space you want to clean up:
if (import.meta.main) {
  const entityId = 'REPLACE_WITH_ENTITY_ID';
  const spaceId = 'REPLACE_WITH_SPACE_ID';
  await deleteEntity(entityId, spaceId);
}
