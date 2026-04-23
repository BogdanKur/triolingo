# FR-060 ? Статистика обучения

Simulation artifact based on state diagram from section 6.

## State Diagram
```mermaid
stateDiagram-v2
[*] --> StatisticsRequested
StatisticsRequested --> SummaryFetched : GET /api/progress/statistics
SummaryFetched --> MetricsAggregated
MetricsAggregated --> StatisticsShown
StatisticsShown --> [*]
```
