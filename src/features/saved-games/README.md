# saved-games feature

Clean Architecture layers:

- `domain`: save entities and validation rules.
- `application`: save/load/list/delete use cases.
- `interface-adapters`: persistence controllers/presenters.
- `frameworks-drivers`: IndexedDB/browser adapters.
