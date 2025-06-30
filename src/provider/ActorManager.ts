import { Actor, HttpAgent, Agent } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

/**
 * Manages a cache of actors keyed by canisterId and idlFactory.
 */
class ActorManager {
  private agent: HttpAgent | Agent;
  private cache = new Map<string, any>();

  constructor(agent: HttpAgent | Agent) {
    this.agent = agent;
  }

  /**
   * Lazily creates or retrieves a cached actor instance.
   */
  getActor<T>(canisterId: string, idlFactory: IDL.InterfaceFactory): T {
    const key = `${canisterId}::${String(idlFactory)}`;
    if (!this.cache.has(key)) {
      const actor = Actor.createActor<T>(idlFactory, {
        agent: this.agent,
        canisterId,
      });
      this.cache.set(key, actor);
    }
    return this.cache.get(key);
  }
}

let globalManager: ActorManager | null = null;

/**
 * Initializes the global ActorManager.
 */
export function initActorManager(agent: HttpAgent | Agent) {
  globalManager = new ActorManager(agent);
}

/**
 * Retrieves the global ActorManager.
 */
export function getActorManager(): ActorManager {
  if (!globalManager) {
    throw new Error(
      'ActorManager not initialized. Wrap your tree with <AgentProvider>.'
    );
  }
  return globalManager;
}