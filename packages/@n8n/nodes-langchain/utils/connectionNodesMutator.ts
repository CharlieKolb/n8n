import { type INode, type Node } from 'n8n-workflow';
import { ChatTrigger } from '../nodes/trigger/ChatTrigger/ChatTrigger.node';
import { ChainRetrievalQa } from '../nodes/chains/ChainRetrievalQA/ChainRetrievalQa.node';
import { Agent } from '../nodes/agents/Agent/Agent.node';
import { ChainLlm } from '../nodes/chains/ChainLLM/ChainLlm.node';
import { OpenAiAssistant } from '../nodes/agents/OpenAiAssistant/OpenAiAssistant.node';
import { MemoryBufferWindow } from '../nodes/memory/MemoryBufferWindow/MemoryBufferWindow.node';
// import {
// 	AGENT_NODE_TYPE,
// 	BASIC_CHAIN_NODE_TYPE,
// 	CHAT_TRIGGER_NODE_TYPE,
// 	OPEN_AI_ASSISTANT_NODE_TYPE,
// 	OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
// 	QA_CHAIN_NODE_TYPE,
// }

// type Node = ;
// type Node = Pick<INode, 'type'>;

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

function has<T extends readonly Node[]>(list: T, x: Node) {
	return list.find((y) => x.description === y.description) !== undefined;
}

const PROMPT_PROVIDER_NODE_NAMES = [new ChatTrigger()] as const;
// This would need a union of all known Node implementations to work as wanted
type PROMPT_PROVIDER_NODES = Exclude<Node, (typeof PROMPT_PROVIDER_NODE_NAMES)[number]>;

const AI_NODES = [
	ChainRetrievalQa,
	Agent,
	ChainLlm,
	OpenAiAssistant,
	// OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
] as const;
type WITH_AI_NODES = (typeof AI_NODES)[number];
type AI_NODES_UNION = ChainRetrievalQa | Agent | ChainLlm | OpenAiAssistant;

function AI_PROMPT_RULE() {
	function matchesParent(parent: Node): parent is AI_NODES_UNION {
		return AI_NODES.find((X) => parent instanceof X) !== undefined;
	}
	function matchesChild(child: Node): child is PROMPT_PROVIDER_NODES {
		return !has(PROMPT_PROVIDER_NODE_NAMES, child);
	}

	const blah = new Rule(matchesParent, matchesChild, (_parent, child) => {
		// parent is typed correctly: _parent: ChainRetrievalQa | Agent | ChainLlm | OpenAiAssistant
		// child is typed Node because Exclude isn't working
		for (const x of child.description.properties) {
			if (x.name === 'promptType') {
				x.default = 'define';
			}
		}
		// Do something
		return true;
	});

	return new Rule(matchesParent, matchesChild, (_parent, child) => {
		// parent is typed correctly: _parent: ChainRetrievalQa | Agent | ChainLlm | OpenAiAssistant
		// child is typed Node because Exclude isn't working
		for (const x of child.description.properties) {
			if (x.name === 'promptType') {
				x.default = 'define';
			}
		}
		// Do something
		return true;
	});
}

const MEMORY_NODE_NAMES = [
	MemoryBufferWindow,
	// 'memoryMotorhead',
	// 'memoryPostgresChat',
	// 'memoryRedisChat',
	// 'memoryXata',
	// 'memoryZep',
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

export function mutateNodesForConnection(parent: Node, child: Node) {
	for (const rule of RULES) {
		if (rule.apply(parent, child)) {
			return;
		}
	}
}
