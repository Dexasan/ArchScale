# Model assumptions

ArchScale translates product-level demand into an initial technical conversation.

- Average requests per second spread daily requests evenly across 86,400 seconds.
- Peak throughput applies the selected concentration multiplier.
- Each application instance is provisioned for 180 requests per second.
- Cache sizing is directional and increases with peak read pressure.
- High and critical availability add database replicas.
- Cost uses intentionally visible blended estimates for compute, database, cache, data, and regions.

Real systems must validate service time, concurrency, query complexity, cache hit rate, payload compression, failure behavior, and provider prices. The recommendations highlight likely pressure points without claiming false precision.
