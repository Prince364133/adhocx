import { LedgerAccount, LedgerAccountType } from '../entities/ledger-account.entity';
import { SettlementBatchAggregate } from '../aggregates/settlement-batch.aggregate';

export interface ILedgerRepository {
  findById(id: string): Promise<LedgerAccount | null>;
  findByOwner(ownerId: string, accountType: LedgerAccountType): Promise<LedgerAccount | null>;
  save(account: LedgerAccount): Promise<void>;
}

export interface ISettlementBatchRepository {
  findById(id: string): Promise<SettlementBatchAggregate | null>;
  findByBatchNumber(batchNumber: string): Promise<SettlementBatchAggregate | null>;
  save(batch: SettlementBatchAggregate): Promise<void>;
  findPendingBatches(): Promise<SettlementBatchAggregate[]>;
}

