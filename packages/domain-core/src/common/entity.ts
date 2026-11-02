/**
 * Base class for Domain Entities.
 * Entities possess a unique identity that persists across time and state mutations.
 */
export abstract class Entity<TIdentifier> {
  protected readonly _id: TIdentifier;

  constructor(id: TIdentifier) {
    this._id = id;
  }

  get id(): TIdentifier {
    return this._id;
  }

  public equals(object?: Entity<TIdentifier>): boolean {
    if (object == null || object === undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof Entity)) {
      return false;
    }

    return this._id === object._id;
  }
}

