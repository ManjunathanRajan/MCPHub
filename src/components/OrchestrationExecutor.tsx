import React, { useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle, Clock, ArrowRight, Zap } from 'lucide-react';
import type { MCPServer } from '../types/database';

interface ExecutionStep {
  id: string;
  serverId: string;
  serverName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  startTime?: number;
}

interface OrchestrationExecutorProps {
  servers: MCPServer[];
  orchestrationServers: string[];
  onExecutionComplete: (results: ExecutionStep[]) => void;
}

export default function OrchestrationExecutor({ 
  servers, 
  orchestrationServers, 
  onExecutionComplete 
}: OrchestrationExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [executionResults, setExecutionResults] = useState<any>(null);

  // Mock MCP server execution functions - using server names as keys
  const mockServerExecutions: Record<string, (input: any) => Promise<any>> = {
    'slack-connector': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: true,
        data: {
          channels: ['#general', '#dev', '#random'],
          messages_sent: 3,
          users_notified: 12
        }
      };
    },
    'github-integration': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        success: true,
        data: {
          repositories: ['repo1', 'repo2'],
          pull_requests: 5,
          issues_created: 2,
          commits_analyzed: 23
        }
      };
    },
    'postgres-client': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        success: true,
        data: {
          tables_queried: 4,
          records_processed: 1250,
          queries_executed: 8
        }
      };
    },
    'notion-sync': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 1800));
      return {
        success: true,
        data: {
          pages_updated: 7,
          blocks_created: 23,
          sync_status: 'completed'
        }
      };
    },
    'openai-assistant': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 2500));
      return {
        success: true,
        data: {
          tokens_used: 1250,
          responses_generated: 3,
          function_calls: 5,
          analysis_complete: true
        }
      };
    },
    'stripe-payments': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 1600));
      return {
        success: true,
        data: {
          payments_processed: 5,
          total_amount: 2450.00,
          subscriptions_created: 2
        }
      };
    },
    'discord-bot': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 1400));
      return {
        success: true,
        data: {
          commands_executed: 8,
          messages_sent: 15,
          users_engaged: 23
        }
      };
    },
    'mongodb-client': async (input: any) => {
      await new Promise(resolve => setTimeout(resolve, 1300));
      return {
        success: true,
        data: {
          documents_processed: 156,
          collections_updated: 3,
          indexes_optimized: 2
        }
      };
    }
  };

  const initializeExecution = (): ExecutionStep[] => {
    const steps: ExecutionStep[] = orchestrationServers.map(serverId => {
      const server = servers.find(s => s.id === serverId);
      return {
        id: `step-${serverId}`,
        serverId: serverId,
        serverName: server?.name || 'Unknown Server',
        status: 'pending'
      };
    });
    setExecutionSteps(steps);
    setCurrentStepIndex(-1);
    setExecutionResults(null);
    return steps;
  };

  const executeStep = async (step: ExecutionStep, stepIndex: number, steps: ExecutionStep[], previousOutput?: any) => {
    // Validate step exists
    if (!step || !step.serverId) {
      throw new Error(`Invalid step at index ${stepIndex}`);
    }
    
    // Find server using the serverId from the step
    const server = servers.find(s => s.id === step.serverId);
    
    if (!server) {
      throw new Error(`Server not found: ${step.serverId}`);
    }

    // Update step to running
    const updatedSteps = steps.map((s, i) => 
      i === stepIndex ? { ...s, status: 'running' as const, startTime: Date.now() } : s
    );
    setExecutionSteps([...updatedSteps]);

    try {
      // Get the mock execution function using server name
      const executeFn = mockServerExecutions[server.name];
      
      if (!executeFn) {
        // If no specific mock function, create a generic one
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
        const result = {
          success: true,
          data: {
            server_name: server.name,
            execution_time: Date.now(),
            status: 'completed',
            operations_performed: Math.floor(Math.random() * 10) + 1
          }
        };
        
        const duration = Date.now() - (step.startTime || Date.now());
        
        const finalSteps = updatedSteps.map((s, i) => 
          i === stepIndex ? { 
            ...s, 
            status: 'completed' as const, 
            output: result.data,
            duration 
          } : s
        );
        setExecutionSteps([...finalSteps]);
        
        return result.data;
      }

      // Execute with previous step's output as input
      const result = await executeFn(previousOutput);
      const duration = Date.now() - (step.startTime || Date.now());

      // Update step to completed
      const finalSteps = updatedSteps.map((s, i) => 
        i === stepIndex ? { 
          ...s, 
          status: 'completed' as const, 
          output: result.data,
          duration 
        } : s
      );
      setExecutionSteps([...finalSteps]);

      return result.data;
    } catch (error) {
      const duration = Date.now() - (step.startTime || Date.now());
      
      // Update step to failed
      const failedSteps = updatedSteps.map((s, i) => 
        i === stepIndex ? { 
          ...s, 
          status: 'failed' as const, 
          error: error instanceof Error ? error.message : 'Unknown error',
          duration 
        } : s
      );
      setExecutionSteps([...failedSteps]);

      throw error;
    }
  };

  const executeChain = async () => {
    if (orchestrationServers.length === 0) {
      console.warn('No servers in orchestration chain');
      return;
    }

    setIsExecuting(true);
    
    // Initialize execution and get the steps array directly
    try {
      const steps = initializeExecution();
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let previousOutput = null;
      let currentSteps = [...steps];

      for (let i = 0; i < orchestrationServers.length; i++) {
        setCurrentStepIndex(i);
        
        try {
          previousOutput = await executeStep(currentSteps[i], i, currentSteps, previousOutput);
          
          // Small delay between steps for better UX
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (stepError) {
          console.error(`Step ${i} failed:`, stepError);
          // Continue with remaining steps even if one fails
          continue;
        }
      }

      // Execution completed - get final state
      setExecutionSteps(currentSteps => {
        const completedSteps = currentSteps.filter(s => s.status === 'completed').length;
        const totalDuration = currentSteps.reduce((sum, step) => sum + (step.duration || 0), 0);
        
        setExecutionResults({
          status: completedSteps === orchestrationServers.length ? 'success' : 'partial',
          totalSteps: orchestrationServers.length,
          completedSteps,
          totalDuration
        });

        onExecutionComplete(currentSteps);
        return currentSteps;
      });
    } catch (error) {
      console.error('Chain execution failed:', error);
      setExecutionResults({
        status: 'error',
        error: error instanceof Error ? error.message : 'Execution failed',
        totalSteps: orchestrationServers.length,
        completedSteps: executionSteps.filter(s => s.status === 'completed').length
      });
    } finally {
      setIsExecuting(false);
      setCurrentStepIndex(-1);
    }
  };

  const resetExecution = () => {
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setExecutionResults(null);
    setIsExecuting(false);
  };

  const getStepIcon = (status: ExecutionStep['status'], isActive: boolean) => {
    if (isActive && status === 'running') {
      return <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />;
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (orchestrationServers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Add servers to create your orchestration chain</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Execution Controls */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          <button
            onClick={executeChain}
            disabled={isExecuting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>{isExecuting ? 'Executing...' : 'Execute Chain'}</span>
          </button>
          <button
            onClick={resetExecution}
            disabled={isExecuting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {executionResults && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            executionResults.status === 'success' 
              ? 'bg-green-100 text-green-700' 
              : executionResults.status === 'partial'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {executionResults.status === 'success' 
              ? `✓ Chain completed in ${(executionResults.totalDuration / 1000).toFixed(1)}s`
              : executionResults.status === 'partial'
              ? `⚠ Partial completion: ${executionResults.completedSteps}/${executionResults.totalSteps} steps`
              : `✗ Execution failed: ${executionResults.error}`
            }
          </div>
        )}
      </div>

      {/* Execution Steps */}
      {executionSteps.length > 0 && (
        <div className="space-y-4">
          {executionSteps.map((step, index) => {
            const isActive = currentStepIndex === index;
            const server = servers.find(s => s.id === step.serverId);
            
            return (
              <div key={step.id} className="relative">
                <div className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : step.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : step.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    {getStepIcon(step.status, isActive)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{step.serverName}</h4>
                      {step.duration && (
                        <span className="text-sm text-gray-500">
                          {(step.duration / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{server?.description}</p>
                    
                    {step.error && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                        Error: {step.error}
                      </div>
                    )}
                    
                    {step.output && (
                      <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Output:</p>
                        <pre className="text-xs text-gray-800 overflow-x-auto">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                
                {index < executionSteps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Execution Summary */}
      {executionResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {executionResults.completedSteps}/{executionResults.totalSteps}
              </div>
              <div className="text-sm text-gray-600">Steps Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {executionResults.totalDuration ? (executionResults.totalDuration / 1000).toFixed(1) : '0'}s
              </div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                executionResults.status === 'success' ? 'text-green-600' : 
                executionResults.status === 'partial' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {executionResults.status === 'success' ? '✓' : 
                 executionResults.status === 'partial' ? '⚠' : '✗'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}