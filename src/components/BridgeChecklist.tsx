import React, { useState } from 'react';
import { 
  BridgeProgress, 
  BridgeStage, 
  toggleStageCollapsed, 
  getStageTrafficLight,
  getCurrentStage 
} from '../lib/bridgeProgress';
import { cn } from '../lib/utils';
import { 
  ChevronDown, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface BridgeChecklistProps {
  progress: BridgeProgress;
  onRetryStep?: (stepId: string) => void;
  onToggleStage?: (stageId: string) => void;
  className?: string;
}

interface TrafficLightProps {
  status: 'red' | 'yellow' | 'green' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  isAnimated?: boolean;
}

const TrafficLight: React.FC<TrafficLightProps> = ({ 
  status, 
  size = 'md', 
  isAnimated = false 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const baseClasses = cn(
    'rounded-full border-2 border-gray-300',
    sizeClasses[size],
    isAnimated && status === 'yellow' && 'animate-pulse'
  );

  const statusClasses = {
    red: 'bg-red-500 border-red-400 shadow-red-500/50',
    yellow: 'bg-yellow-500 border-yellow-400 shadow-yellow-500/50',
    green: 'bg-green-500 border-green-400 shadow-green-500/50',
    gray: 'bg-gray-300 border-gray-400',
  };

  return (
    <div 
      className={cn(
        baseClasses, 
        statusClasses[status],
        status !== 'gray' && 'shadow-lg'
      )}
    />
  );
};

interface StageRowProps {
  stage: BridgeStage;
  progress: BridgeProgress;
  onRetryStep?: (stepId: string) => void;
  onToggle: (stageId: string) => void;
}

const StageRow: React.FC<StageRowProps> = ({ 
  stage, 
  progress, 
  onRetryStep, 
  onToggle 
}) => {
  const trafficLight = getStageTrafficLight(stage);
  const isActive = getCurrentStage(progress)?.id === stage.id;
  
  const completedSteps = stage.steps.filter(s => s.status === 'completed').length;
  const totalSteps = stage.steps.length;
  const hasFailedSteps = stage.steps.some(s => s.status === 'failed');
  const currentStep = stage.steps.find(s => s.status === 'loading');

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Stage Header */}
      <button
        onClick={() => onToggle(stage.id)}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left transition-colors',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
          isActive && 'bg-blue-50 border-blue-200'
        )}
      >
        <div className="flex items-center space-x-3">
          <TrafficLight 
            status={trafficLight} 
            size="lg"
            isAnimated={stage.status === 'loading'}
          />
          
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">
              {stage.title}
            </h3>
            <p className="text-sm text-gray-600">
              {stage.description}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500">
                {completedSteps}/{totalSteps} steps
              </span>
              {stage.status === 'loading' && currentStep && (
                <span className="text-xs text-blue-600 font-medium">
                  {currentStep.title}
                </span>
              )}
              {hasFailedSteps && (
                <span className="text-xs text-red-600 font-medium">
                  Needs attention
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {stage.status === 'loading' && (
            <div className="w-8 h-8 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          )}
          
          {stage.isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Step Details */}
      {!stage.isCollapsed && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-4 space-y-3">
            {stage.steps.map((step) => (
              <div 
                key={step.id}
                className={cn(
                  'flex items-center justify-between p-3 bg-white rounded border',
                  step.status === 'loading' && 'border-blue-200 bg-blue-50',
                  step.status === 'failed' && 'border-red-200 bg-red-50',
                  step.status === 'completed' && 'border-green-200 bg-green-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {step.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {step.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    {step.status === 'loading' && (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    {step.status === 'pending' && (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    {step.status === 'skipped' && (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {step.description}
                    </p>
                    
                    {step.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {step.error}
                      </p>
                    )}
                    
                    {step.txHash && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Tx: {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {step.status === 'failed' && step.retryable && onRetryStep && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryStep(step.id);
                      }}
                      className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                  
                  {step.estimatedDuration && step.status === 'pending' && (
                    <span className="text-xs text-gray-500">
                      ~{step.estimatedDuration}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const BridgeChecklist: React.FC<BridgeChecklistProps> = ({
  progress,
  onRetryStep,
  onToggleStage,
  className,
}) => {
  const [localProgress, setLocalProgress] = useState(progress);

  // Update local progress when prop changes
  React.useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  const handleToggle = (stageId: string) => {
    if (onToggleStage) {
      onToggleStage(stageId);
    } else {
      // Local state management
      setLocalProgress(prev => toggleStageCollapsed(prev, stageId));
    }
  };

  const totalSteps = localProgress.steps.length;
  const completedSteps = localProgress.steps.filter(s => s.status === 'completed').length;
  const failedSteps = localProgress.steps.filter(s => s.status === 'failed').length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {localProgress.direction === 'evm-to-ic' ? '🔄 EVM → IC Bridge' : '🔄 IC → EVM Cast'}
          </h2>
          <div className="text-sm text-gray-600">
            {completedSteps}/{totalSteps} steps
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              failedSteps > 0 ? 'bg-red-500' : 'bg-blue-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {progressPercent}% complete
          </span>
          {failedSteps > 0 && (
            <span className="text-red-600 font-medium">
              {failedSteps} failed step{failedSteps !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Stage List */}
      <div className="space-y-2">
        {localProgress.stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            progress={localProgress}
            onRetryStep={onRetryStep}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};

export default BridgeChecklist;

// Also export with the old name for backward compatibility
export { BridgeChecklist as CompactBridgeChecklist };
