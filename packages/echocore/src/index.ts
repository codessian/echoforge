/**
 * @echoforge/echocore
 * Core agent framework for the EchoForge ecosystem
 */

// Export core agent system
export * from './core';

// Export agent implementations
export * from './agents';

// Export Guild Protocol components
export * from './guild/GuildContract';
export * from './guild/GuildManager';
export * from './guild/BaseGuildMember';

// Export Messaging System components
export * from './messaging/MessageContract';
export * from './messaging/MessageBroker';
export * from './messaging/AgentMailbox';
export * from './messaging/InMemoryMessageStore';
export * from './messaging/IndexedDBMessageStore';

// Export Metrics and Monitoring components
export * from './metrics';

// We don't export CLI tools directly as they're meant to be run as scripts

// Export version information
export const version = '0.1.0';
