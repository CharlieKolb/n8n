import type { INode } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';

type Pattern<Parent extends Pick<INode, 'type'>, Child extends Pick<INode, 'type'>> = {
	matchesChild: (child: Child) => child is Child;
	matchesParent: (parent: Parent) => parent is Parent;
};

class Rule<Parent extends Pick<INode, 'type'>, Child extends Pick<INode, 'type'>> {
	constructor(
		private pattern: Pattern<Parent, Child>,
		private mutate: (p: Parent, c: Child) => boolean,
	) {}

	apply(parent: Parent, child: Child) {
		if (!this.pattern.matchesParent(parent) || !this.pattern.matchesChild(child)) {
			return false;
		}

		return this.mutate(parent, child);
	}
}

const USE_PREVIOUS_NODES = [CHAT_TRIGGER_NODE_TYPE] as const;
type USE_PREVIOUS_NODES_TYPES = (typeof USE_PREVIOUS_NODES)[number];
type WITHOUT_USE_PREVIOUS_NODES = { type: Exclude<string, USE_PREVIOUS_NODES_TYPES> };

const AI_NODES = [CHAT_TRIGGER_NODE_TYPE] as const;
type AI_NODES_TYPE = (typeof AI_NODES)[number];
type WITHOUT_AI_NODES_TYPE = { type: Exclude<string, AI_NODES_TYPE> };

function makeRule<Parent extends Pick<INode, 'type'>, Child extends Pick<INode, 'type'>>(
	matchesChild: (child: Child) => child is Child,
	matchesParent: (parent: Parent) => parent is Parent,
	apply: (parent: Parent, child: Child) => boolean,
) {
	return new Rule<Parent, Child>(
		{
			matchesChild,
			matchesParent,
		},
		apply,
	);
}

const RULES = [
	makeRule<WITHOUT_USE_PREVIOUS_NODES, WITHOUT_AI_NODES_TYPE>(
		(child): child is WITHOUT_USE_PREVIOUS_NODES =>
			USE_PREVIOUS_NODES.includes(child.type as USE_PREVIOUS_NODES_TYPES),
		(parent): parent is WITHOUT_AI_NODES_TYPE => parent.type === 'n8n-nodes-base.start',
		(parent, child) => {
			// Do something
			return true;
		},
	),
] as const;

export function mutateNodesForConnection(parent: INode, child: INode) {
	for (const rule of RULES) {
		if (rule.apply(parent, child)) {
			return;
		}
	}
}
