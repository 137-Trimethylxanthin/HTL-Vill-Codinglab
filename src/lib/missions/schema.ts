import { z } from 'zod';
import { BLOCK_TYPES, type BlockNode } from '$lib/blocks/types';

export const TILE_CHARS = '.BPKDS';
export type Dir = 'N' | 'E' | 'S' | 'W';

const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
	z.object({
		id: z.string().min(1),
		type: z.enum(BLOCK_TYPES),
		n: z.number().int().optional(),
		children: z.array(BlockNodeSchema).optional()
	})
);

const blockTypesIn = (nodes: BlockNode[]): string[] =>
	nodes.flatMap((node) => [node.type, ...blockTypesIn(node.children ?? [])]);

export const MissionSchema = z
	.object({
		id: z.string().regex(/^\d+\.\d+$/),
		level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
		title: z.string().min(1),
		goalText: z.string().min(1).max(80),
		map: z.object({
			rows: z.array(z.string().min(1)).min(1),
			start: z.object({
				x: z.number().int(),
				y: z.number().int(),
				dir: z.enum(['N', 'E', 'S', 'W'])
			})
		}),
		blocks: z.array(z.enum(BLOCK_TYPES)).min(1),
		goal: z.object({ type: z.literal('landOn') }),
		stars: z.object({
			optimalBlocks: z.number().int().positive(),
			maxRunsFor3: z.number().int().positive()
		}),
		hints: z.array(z.string().min(1)).min(1),
		solution: z.array(BlockNodeSchema).min(1)
	})
	.superRefine((m, ctx) => {
		const { rows, start } = m.map;
		if (rows.some((row) => row.length !== rows[0].length)) {
			ctx.addIssue({
				code: 'custom',
				path: ['map', 'rows'],
				message: 'Alle Zeilen müssen gleich lang sein.'
			});
		}
		rows.forEach((row, y) => {
			for (const ch of row) {
				if (!TILE_CHARS.includes(ch)) {
					ctx.addIssue({
						code: 'custom',
						path: ['map', 'rows', y],
						message: `Unbekanntes Feld "${ch}".`
					});
				}
			}
		});
		if (rows[start.y]?.[start.x] !== '.') {
			ctx.addIssue({
				code: 'custom',
				path: ['map', 'start'],
				message: 'Start muss auf der Karte auf einem leeren Feld liegen.'
			});
		}
		const outside = blockTypesIn(m.solution).filter((type) => !m.blocks.includes(type as never));
		if (outside.length > 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['solution'],
				message: `Lösung benutzt Blöcke außerhalb der Palette: ${outside.join(', ')}`
			});
		}
	});

export type Mission = z.infer<typeof MissionSchema>;

export function parseMission(raw: unknown): Mission {
	const result = MissionSchema.safeParse(raw);
	if (!result.success) throw new Error(z.prettifyError(result.error));
	return result.data;
}
