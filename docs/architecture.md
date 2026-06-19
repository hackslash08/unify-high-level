# Architecture Diagrams

## Request Flow — Manual Sync

```mermaid
sequenceDiagram
  participant U as User
  participant W as Vue SPA
  participant F as Cloud Function
  participant R as Connector Registry
  participant E as External API
  participant H as HighLevel API
  participant D as Firestore

  U->>W: Click Sync Now
  W->>F: POST /sync (Bearer token)
  F->>D: Acquire lock
  F->>R: getConnector(id)
  R->>E: listContacts (paginated)
  E-->>F: raw records
  F->>F: mapToUnified + Zod validate
  loop Each contact
    F->>H: POST contact
    alt Success
      F->>D: increment success
    else Failure
      F->>D: write syncError
    end
  end
  F->>D: update syncRun + connection
  F-->>W: syncRunId
```

## Data Model (Firestore)

```mermaid
erDiagram
  users ||--o{ connections : has
  users ||--o{ syncRuns : triggers
  syncRuns ||--o{ syncErrors : contains
  users ||--o| tokens : stores

  users {
    string uid PK
    boolean hlConnected
    string hlLocationId
  }

  connections {
    string id PK
    string userId FK
    string connectorId
    string status
    datetime lastSyncAt
  }

  tokens {
    string id PK
    string userId
    string provider
    string accessToken encrypted
  }

  syncRuns {
    string id PK
    string status
    int recordsSucceeded
    int recordsFailed
  }
```

## Connector Extensibility

```mermaid
flowchart LR
  NewConnector[New Connector Module]
  Registry[Connector Registry]
  API[Unified API]
  Sync[Sync Engine]
  UI[Connectors UI]

  NewConnector -->|registerConnector| Registry
  Registry --> API
  Registry --> Sync
  Registry --> UI
```
