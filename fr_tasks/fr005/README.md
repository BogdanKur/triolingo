# FR-005 ? Редактирование профиля и настроек

Simulation artifact based on state diagram from section 6.

## State Diagram
```mermaid
stateDiagram-v2
[*] --> ProfileLoaded
ProfileLoaded --> EditProfile : PATCH /api/profile
ProfileLoaded --> EditSettings : PATCH /api/settings
EditProfile --> ProfileSaved
EditSettings --> SettingsSaved
ProfileSaved --> ProfileLoaded
SettingsSaved --> ProfileLoaded
ProfileLoaded --> [*]
```
