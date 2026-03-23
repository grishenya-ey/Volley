# Диаграммы архитектуры и потоков данных

Этот документ содержит диаграммы для визуализации архитектуры системы управления счетом и партиями.

## 1. Диаграмма состояний партии

```mermaid
stateDiagram-v2
    [*] --> PENDING: Создание матча
    PENDING --> IN_PROGRESS: startSet()
    IN_PROGRESS --> IN_PROGRESS: changeScore()
    IN_PROGRESS --> COMPLETED: finishSet()<br/>(счет >= 25/15, разница >= 2)
    COMPLETED --> PENDING: updateSet(status: PENDING)
    COMPLETED --> IN_PROGRESS: updateSet(status: IN_PROGRESS,<br/>endTime: null)
    IN_PROGRESS --> PENDING: updateSet(status: PENDING)
    PENDING --> [*]: Удаление матча
    COMPLETED --> [*]: Удаление матча
    
    note right of IN_PROGRESS
        Счет обнуляется при startSet(),
        а не при finishSet()
        (для отображения в vMix)
    end note
```

## 2. Диаграмма потоков данных (UI → Domain Layer)

```mermaid
sequenceDiagram
    participant UI as UI Layer<br/>(useMatch.js)
    participant Service as Service Layer<br/>(SetService, ScoreService)
    participant Domain as Domain Layer<br/>(SetDomain)
    participant Validator as Validator Layer<br/>(SetValidator)
    participant Rules as Business Rules<br/>(volleyballRules.js)
    
    UI->>Service: startSet(match)
    Service->>Domain: calculateNextSetNumber(match)
    Domain-->>Service: nextSetNumber
    Service->>Service: Создание нового матча<br/>(immutability)
    Service-->>UI: newMatch
    
    UI->>Service: changeScore(match, 'A', 1)
    Service->>Validator: validateScore(scoreA, scoreB)
    Validator-->>Service: validation result
    Service->>Service: Обновление счета<br/>(immutability)
    Service-->>UI: newMatch
    
    UI->>Service: finishSet(match)
    Service->>Rules: canFinishSet(scoreA, scoreB, setNumber)
    Rules-->>Service: canFinish
    Service->>Domain: processTimeForStatus(set, COMPLETED)
    Domain-->>Service: processedSet
    Service->>Service: Создание завершенной партии<br/>(immutability)
    Note over Service: Счет НЕ обнуляется<br/>в finishSet()
    Service-->>UI: newMatch
```

## 3. Диаграмма синхронизации с мобильным API

```mermaid
sequenceDiagram
    participant Mobile as Мобильный<br/>интерфейс
    participant API as API Layer<br/>(MatchApiController)
    participant Service as Service Layer
    participant Main as Основное<br/>приложение
    participant History as History Service
    
    Mobile->>API: POST /api/match/score<br/>{team: 'A', delta: 1}
    API->>Service: changeScore(match, 'A', 1)
    Service-->>API: newMatch
    API->>History: addAction(action)
    API-->>Mobile: {success: true, data: newMatch}
    
    Mobile->>Main: Синхронизация<br/>(через IPC или WebSocket)
    Main->>Main: Обновление состояния
    Main-->>Mobile: Подтверждение синхронизации
    
    Note over Mobile,Main: Синхронизация происходит<br/>в реальном времени
```

## 4. Архитектурная диаграмма слоев

```mermaid
graph TB
    subgraph "UI Layer"
        UI[React Components<br/>useMatch Hook]
    end
    
    subgraph "API Layer"
        API[MatchApiController<br/>Mobile API]
    end
    
    subgraph "Service Layer"
        SetService[SetService<br/>Оркестрация операций]
        ScoreService[ScoreService<br/>Управление счетом]
        HistoryService[HistoryService<br/>История действий]
    end
    
    subgraph "Domain Layer"
        SetDomain[SetDomain<br/>Бизнес-логика]
        SetStateMachine[SetStateMachine<br/>Машина состояний]
    end
    
    subgraph "Validator Layer"
        SetValidator[SetValidator<br/>Валидация данных]
        TimeValidator[TimeValidator<br/>Валидация времени]
    end
    
    subgraph "Business Rules"
        Rules[volleyballRules.js<br/>Правила волейбола]
        TimeUtils[timeUtils.js<br/>Утилиты времени]
    end
    
    UI --> SetService
    UI --> ScoreService
    UI --> HistoryService
    
    API --> SetService
    API --> ScoreService
    API --> HistoryService
    
    SetService --> SetDomain
    SetService --> SetValidator
    SetService --> Rules
    SetService --> TimeUtils
    
    ScoreService --> SetDomain
    ScoreService --> SetValidator
    
    SetDomain --> SetStateMachine
    
    SetValidator --> Rules
    TimeValidator --> TimeUtils
    
    style UI fill:#e1f5ff
    style API fill:#e1f5ff
    style SetService fill:#fff4e1
    style ScoreService fill:#fff4e1
    style HistoryService fill:#fff4e1
    style SetDomain fill:#e8f5e9
    style SetValidator fill:#fce4ec
    style Rules fill:#f3e5f5
```

## 5. Диаграмма жизненного цикла матча

```mermaid
flowchart TD
    Start([Создание матча]) --> Pending[Партия 1: PENDING]
    Pending --> StartSet[Начало партии<br/>startSet]
    StartSet --> InProgress[Партия 1: IN_PROGRESS<br/>scoreA: 0, scoreB: 0]
    InProgress --> ChangeScore[Изменение счета<br/>changeScore]
    ChangeScore --> CheckFinish{Можно<br/>завершить?}
    CheckFinish -->|Нет| InProgress
    CheckFinish -->|Да| FinishSet[Завершение партии<br/>finishSet]
    FinishSet --> Completed[Партия 1: COMPLETED<br/>scoreA: 25, scoreB: 23<br/>Счет сохраняется в currentSet]
    Completed --> NextSet{Есть<br/>следующая<br/>партия?}
    NextSet -->|Да| StartSet
    NextSet -->|Нет| End([Конец матча])
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style InProgress fill:#fff4e1
    style Completed fill:#e8f5e9
    style CheckFinish fill:#fce4ec
    style NextSet fill:#fce4ec
```

## 6. Диаграмма обработки обновления партии

```mermaid
flowchart TD
    Start([updateSet вызван]) --> FindSet[Найти партию<br/>SetDomain.findSet]
    FindSet --> Validate[Валидация<br/>SetValidator.validateSetUpdate]
    Validate --> Valid{Валидация<br/>успешна?}
    Valid -->|Нет| Error[Выбросить ошибку]
    Valid -->|Да| IsCurrent{Текущая<br/>партия?}
    IsCurrent -->|Да| UpdateCurrent[Обновить currentSet]
    IsCurrent -->|Нет| UpdateCompleted[Обновить в sets]
    UpdateCurrent --> CheckStatus{Статус<br/>изменен?}
    UpdateCompleted --> CheckStatus
    CheckStatus -->|Да| ProcessTime[Обработать время<br/>SetDomain.processTimeForStatus]
    CheckStatus -->|Нет| Return[Вернуть новый матч]
    ProcessTime --> Return
    Return --> End([Готово])
    Error --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style Validate fill:#fce4ec
    style ProcessTime fill:#e8f5e9
    style Error fill:#ffebee
```

## 7. Диаграмма работы с историей действий

```mermaid
sequenceDiagram
    participant UI as UI Layer
    participant Service as Service Layer
    participant History as History Service
    participant Storage as History Storage<br/>(Memory)
    
    UI->>Service: changeScore(match, 'A', 1)
    Service->>Service: Обновление матча
    Service->>History: addAction({<br/>type: 'score_change',<br/>previousState: oldMatch<br/>})
    History->>Storage: Сохранение действия
    Storage-->>History: Подтверждение
    History-->>Service: Успех
    Service-->>UI: newMatch
    
    UI->>History: undoLastAction()
    History->>Storage: Получить последнее действие
    Storage-->>History: lastAction
    History-->>UI: lastAction<br/>(с previousState)
    UI->>UI: Восстановление previousState
    
    Note over History,Storage: История хранится в памяти<br/>Максимум 100 действий
```

## Примечания

- Все диаграммы созданы с использованием Mermaid
- Диаграммы отражают текущую архитектуру после рефакторинга
- Для обновления диаграмм используйте Mermaid Live Editor: https://mermaid.live/
