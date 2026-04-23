# FR-032 ? Разблокировка достижений

Simulation artifact based on state diagram from section 6.

## State Diagram
```mermaid
stateDiagram-v2
[*] --> ProgressUpdated
ProgressUpdated --> ThresholdsChecked : xp_required / streak_required
ThresholdsChecked --> AchievementUnlocked : условия выполнены
ThresholdsChecked --> NoUnlock : условия не выполнены
AchievementUnlocked --> NotificationCreated : type=achievement-unlocked
NotificationCreated --> RewardVisible
NoUnlock --> [*]
RewardVisible --> [*]
```
