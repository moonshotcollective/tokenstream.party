export class CachedValue {
  constructor(value, ttlMillis) {
    this.value = value;
    this.ttlMillis = ttlMillis;
    this.updatedAt = Date.now();
  }

  isStale = () => {
    return (this.updatedAt + this.ttlMillis) <= Date.now();
  }
}