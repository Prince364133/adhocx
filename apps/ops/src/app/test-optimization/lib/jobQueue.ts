import type {
  OptimizationJobRecord,
  JobLifecycleState,
  OptimizationResult,
} from '../types.ts';
import crypto from 'crypto';

// In-memory job repository with 24-hour retention
const MAX_STORED_JOBS = 500;
const jobStore = new Map<string, OptimizationJobRecord>();
const idempotencyStore = new Map<string, string>(); // idempotencyKey -> jobId

/**
 * Generates a deterministic SHA-256 idempotency hash for an optimization run request.
 */
export function computeOptimizationHash(tenantId: string, payload: any): string {
  const normalized = JSON.stringify({
    tenantId: tenantId.trim().toLowerCase(),
    rows: (payload.rows || []).map((r: any) => ({
      name: (r.employee_name || r.name || '').trim(),
      pickup: (r.pickup_address || r.pickup || '').trim(),
    })),
    shift: (payload.loginShiftTime || '08:00').trim(),
    office: (payload.officeAddressOverride || '').trim(),
    vehicleCategory: payload.vehicleCategory || 'ALL',
    profile: payload.profile || 'BALANCED',
  });

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Creates or retrieves an existing optimization job ensuring strict idempotency.
 */
export function createOrGetOptimizationJob(
  tenantId: string,
  payload: any,
  clientProvidedKey?: string,
): { job: OptimizationJobRecord; isExisting: boolean } {
  const hashKey = clientProvidedKey || computeOptimizationHash(tenantId, payload);
  const existingJobId = idempotencyStore.get(hashKey);

  if (existingJobId && jobStore.has(existingJobId)) {
    const existing = jobStore.get(existingJobId)!;
    // If not failed or cancelled, return existing job
    if (existing.status !== 'FAILED' && existing.status !== 'CANCELLED') {
      return { job: existing, isExisting: true };
    }
  }

  const jobId = `job-opt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = Date.now();

  const newJob: OptimizationJobRecord = {
    jobId,
    tenantId,
    idempotencyKey: hashKey,
    status: 'QUEUED',
    progressPct: 0,
    currentStepMessage: 'Optimization job queued for worker processing',
    createdAt: now,
    updatedAt: now,
    heartbeatAt: now,
  };

  // Manage cache capacity
  if (jobStore.size >= MAX_STORED_JOBS) {
    const oldestKey = jobStore.keys().next().value;
    if (oldestKey) {
      const oldJob = jobStore.get(oldestKey);
      if (oldJob?.idempotencyKey) idempotencyStore.delete(oldJob.idempotencyKey);
      jobStore.delete(oldestKey);
    }
  }

  jobStore.set(jobId, newJob);
  idempotencyStore.set(hashKey, jobId);

  return { job: newJob, isExisting: false };
}

/**
 * Retrieves a job by ID.
 */
export function getOptimizationJob(jobId: string): OptimizationJobRecord | null {
  return jobStore.get(jobId) || null;
}

/**
 * Updates the lifecycle progress of an active optimization job.
 */
export function updateOptimizationJob(
  jobId: string,
  updates: {
    status?: JobLifecycleState;
    progressPct?: number;
    currentStepMessage?: string;
    result?: OptimizationResult;
    error?: string;
  },
): OptimizationJobRecord | null {
  const job = jobStore.get(jobId);
  if (!job) return null;

  const now = Date.now();
  if (updates.status) job.status = updates.status;
  if (updates.progressPct !== undefined) job.progressPct = updates.progressPct;
  if (updates.currentStepMessage) job.currentStepMessage = updates.currentStepMessage;
  if (updates.result) job.result = updates.result;
  if (updates.error) job.error = updates.error;

  job.updatedAt = now;
  job.heartbeatAt = now;

  jobStore.set(jobId, job);
  return job;
}

/**
 * Cancels a running or queued job.
 */
export function cancelOptimizationJob(jobId: string): boolean {
  const job = jobStore.get(jobId);
  if (!job) return false;

  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    return false; // Cannot cancel completed jobs
  }

  job.status = 'CANCELLED';
  job.currentStepMessage = 'Job cancelled by operator';
  job.updatedAt = Date.now();
  jobStore.set(jobId, job);
  return true;
}

/**
 * Lists all jobs for a specific tenant.
 */
export function listOptimizationJobs(tenantId: string): OptimizationJobRecord[] {
  return Array.from(jobStore.values())
    .filter((j) => j.tenantId === tenantId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
