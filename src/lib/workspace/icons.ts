import type { Component } from 'svelte';
import {
	ArrowUp,
	Camera,
	Package,
	PackageOpen,
	PlaneLanding,
	PlaneTakeoff,
	Repeat,
	RotateCcw,
	RotateCw
} from '@lucide/svelte';
import type { BlockType } from '$lib/blocks/types';

export const BLOCK_ICONS: Record<BlockType, Component> = {
	takeoff: PlaneTakeoff,
	land: PlaneLanding,
	forward: ArrowUp,
	turn_left: RotateCcw,
	turn_right: RotateCw,
	pick_up: Package,
	drop: PackageOpen,
	photo: Camera,
	repeat: Repeat
};
