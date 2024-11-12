import { type INode } from 'n8n-workflow';
import {
	AGENT_NODE_TYPE,
	BASIC_CHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	OPEN_AI_ASSISTANT_NODE_TYPE,
	OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
	QA_CHAIN_NODE_TYPE,
} from '@/constants';

type Node = Pick<INode, 'type'>;

class Rule<Parent extends Node, Child extends Node> {
	constructor(
		private matchesParent: (parent: Node) => parent is Parent,
		private matchesChild: (child: Node) => child is Child,
		private mutate: (p: Parent, c: Child) => boolean,
	) {}

	apply(parent: Node, child: Node) {
		if (!this.matchesParent(parent) || !this.matchesChild(child)) {
			return false;
		}

		return this.mutate(parent, child);
	}
}

function has<T extends readonly string[]>(list: T, x: string) {
	return list.includes(x);
}

const PROMPT_PROVIDER_NODE_NAMES = [CHAT_TRIGGER_NODE_TYPE] as const;
type PROMPT_PROVIDER_NODES = { type: Exclude<string, (typeof PROMPT_PROVIDER_NODE_NAMES)[number]> };

const AI_NODES = [
	QA_CHAIN_NODE_TYPE,
	AGENT_NODE_TYPE,
	BASIC_CHAIN_NODE_TYPE,
	OPEN_AI_ASSISTANT_NODE_TYPE,
	OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
] as const;
type WITH_AI_NODES = { type: (typeof AI_NODES)[number] };

function AI_PROMPT_RULE() {
	function matchesChild(child: Node): child is PROMPT_PROVIDER_NODES {
		return !has(PROMPT_PROVIDER_NODE_NAMES, child.type);
	}
	function matchesParent(parent: Node): parent is WITH_AI_NODES {
		return has(AI_NODES, parent.type);
	}

	return new Rule(matchesParent, matchesChild, (_parent, child) => {
		Object.assign<Partial<INode>, Partial<INode>>(child, {
			parameters: { promptType: 'define' },
		});
		// Do something
		return true;
	});
}

const MEMORY_NODE_NAMES = [
	'memoryBufferWindow',
	'memoryMotorhead',
	'memoryPostgresChat',
	'memoryRedisChat',
	'memoryXata',
	'memoryZep',
] as const;
type MEMORY_NODES = { type: (typeof MEMORY_NODE_NAMES)[number] };

const AI_SESSION_ID_RULE = new Rule(
	(parent): parent is PROMPT_PROVIDER_NODES => has(PROMPT_PROVIDER_NODE_NAMES, parent.type),
	(child): child is MEMORY_NODES => has(MEMORY_NODE_NAMES, child.type),
	(_parent, child) => {
		Object.assign<Partial<INode>, Partial<INode>>(child, {
			parameters: { sessionIdType: 'customKey' },
		});

		return true;
	},
);

// Only the first matching rule will be applied
const RULES = [AI_PROMPT_RULE(), AI_SESSION_ID_RULE];

export function mutateNodesForConnection(parent: INode, child: INode) {
	for (const rule of RULES) {
		if (rule.apply(parent, child)) {
			return;
		}
	}
}

function mutateNodesForConnection2(parent: INode, child: INode) {
	if (!has(PROMPT_PROVIDER_NODE_NAMES, child.type) && has(AI_NODES, parent.type)) {
		Object.assign<Partial<INode>, Partial<INode>>(child, {
			parameters: { promptType: 'define' },
		});
		return;
	}
	if (has(PROMPT_PROVIDER_NODE_NAMES, parent.type) && has(MEMORY_NODE_NAMES, child.type)) {
		Object.assign<Partial<INode>, Partial<INode>>(child, {
			parameters: { sessionIdType: 'customKey' },
		});
		return;
	}
}
