import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { useAuth, useIsAuthenticated } from '../../hooks/useAuth';
import { useActor } from '../../hooks/useActor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { IdentityKitAuthType } from '@nfid/identitykit';
import { AgentProvider } from '../../provider/AgentProvider';
import '@nfid/identitykit/react/styles.css';

// Query client for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Providers wrapper for auth hooks
const withAuthProviders = (Story: any) => (
  <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
    <AgentProvider network="local">
      <QueryClientProvider client={queryClient}>
        <div className="p-6 bg-gray-50 min-h-screen">
          <Story />
        </div>
      </QueryClientProvider>
    </AgentProvider>
  </IdentityKitProvider>
);

/**
 * AuthHooksDemo - Demonstrates authentication hook usage patterns
 */
function AuthHooksDemo() {
  const { connect, disconnect, user } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const actor = useActor();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connect();
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Authentication Status</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">useIsAuthenticated()</h3>
            <div className={`px-3 py-2 rounded ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">useActor()</h3>
            <div className={`px-3 py-2 rounded ${actor ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {actor ? '✅ Agent Ready' : '⏳ No Agent'}
            </div>
          </div>
        </div>

        {user && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">User Information</h3>
            <div className="text-sm text-blue-700">
              <p><strong>Principal:</strong> {user.principal.toString()}</p>
              <p><strong>Account ID:</strong> {user.accountId}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isAuthenticated ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Hook Usage Examples</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">useAuth() Hook</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`const { connect, disconnect, user } = useAuth();

// Connect to wallet
await connect();

// Access user information
console.log(user.principal);
console.log(user.accountId);

// Disconnect
await disconnect();`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">useIsAuthenticated() Hook</h3>
            <pre className="text-sm text-gray-700">
{`const isAuthenticated = useIsAuthenticated();

// Simple boolean check for auth state
if (isAuthenticated) {
  // User is logged in
}`}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">useActor() Hook</h3>
            <pre className="text-sm text-gray-700">
{`const actor = useActor();

// Get IC agent for canister calls
if (actor) {
  // Agent is ready for calls
  const result = await actor.call('method_name', []);
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof AuthHooksDemo> = {
  title: 'Hooks/Authentication',
  component: AuthHooksDemo,
  tags: ['autodocs'],
  decorators: [withAuthProviders],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Authentication Hooks

A comprehensive set of hooks for managing user authentication and IC agent connections.

### Available Hooks

#### useAuth()
Core authentication hook providing connection management and user state.
- **connect()**: Initiates wallet connection flow
- **disconnect()**: Disconnects wallet and clears session  
- **user**: Current user principal and account information

#### useIsAuthenticated()
Simple boolean hook for checking authentication status.
- Returns \`true\` when user is connected and authenticated
- Updates automatically when auth state changes

#### useActor() 
Provides access to the IC agent for canister interactions.
- Returns the current agent instance
- Null when not authenticated or agent not ready
- Use for making canister calls after authentication

### Usage Patterns

#### Basic Authentication Flow
\`\`\`typescript
const { connect, disconnect, user } = useAuth();
const isAuthenticated = useIsAuthenticated();

// Show login button when not authenticated
if (!isAuthenticated) {
  return <button onClick={connect}>Connect</button>;
}

// Access user data when authenticated
return <div>Welcome {user.principal.toString()}</div>;
\`\`\`

#### Protected Component Pattern
\`\`\`typescript
function ProtectedComponent() {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }
  
  return <AuthenticatedContent />;
}
\`\`\`

#### Canister Integration
\`\`\`typescript
const actor = useActor();
const { user } = useAuth();

const handleOperation = async () => {
  if (actor && user) {
    const result = await actor.call('method_name', [user.principal]);
  }
};
\`\`\`

### Error Handling
All auth hooks handle errors gracefully and provide loading states for better UX.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo of authentication hooks showing connection flow and user state management.',
      },
    },
  },
};

export const NotAuthenticated: Story = {
  decorators: [
    (Story) => (
      <IdentityKitProvider authType={IdentityKitAuthType.ACCOUNTS}>
        <AgentProvider network="local">
          <QueryClientProvider client={queryClient}>
            <div className="p-6 bg-gray-50 min-h-screen">
              <div className="max-w-2xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-bold mb-4">Not Authenticated State</h2>
                  <div className="space-y-4">
                    <div className="px-3 py-2 rounded bg-red-100 text-red-800">
                      ❌ User not authenticated
                    </div>
                    <div className="px-3 py-2 rounded bg-gray-100 text-gray-600">
                      ⏳ No agent available
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Connect Wallet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </QueryClientProvider>
        </AgentProvider>
      </IdentityKitProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Shows the unauthenticated state with connection prompt.',
      },
    },
  },
};

export const LoadingState: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Authentication Loading</h2>
            <div className="space-y-4">
              <div className="px-3 py-2 rounded bg-yellow-100 text-yellow-800">
                ⏳ Authenticating...
              </div>
              <div className="px-3 py-2 rounded bg-gray-100 text-gray-600">
                ⏳ Initializing agent...
              </div>
              <button disabled className="px-4 py-2 bg-blue-600 text-white rounded opacity-50">
                Connecting...
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Loading state during authentication process.',
      },
    },
  },
};

export const ErrorState: Story = {
  decorators: [
    (Story) => (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Authentication Error</h2>
            <div className="space-y-4">
              <div className="px-3 py-2 rounded bg-red-100 text-red-800">
                ❌ Connection failed: User rejected request
              </div>
              <div className="px-3 py-2 rounded bg-red-100 text-red-800">
                ❌ Agent initialization failed
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Retry Connection
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Error state when authentication fails with retry options.',
      },
    },
  },
};