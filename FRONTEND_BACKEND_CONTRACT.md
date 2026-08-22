# Notes App — Frontend / Backend Contract

The frontend in `notes/templates/notes/` is designed for the Django `notes` app.

## Expected note fields

The templates expect:

- `id`
- `title`
- `content`
- `created_at`
- `updated_at`
- `is_pinned`
- optional `category`

## Expected context on the home page

The home view should provide:

- `notes`
- optional `total_notes`
- optional `pinned_count`
- optional `deleted_count`
- optional `personal_count`
- optional `work_count`
- optional `ideas_count`
- optional `college_count`

The count variables are optional because the templates already have fallbacks.

## URL names expected by the frontend

Add these URL names in `notes/urls.py`:

```text
home
create_note
note_detail
edit_note
delete_note
toggle_pin
pinned_notes
deleted_notes
```

`restore_note` and `permanent_delete_note` are used only by `deleted_notes.html`.

## Suggested routes

```text
/                       -> home
/create/                -> create_note
/<int:id>/              -> note_detail
/<int:id>/edit/         -> edit_note
/<int:id>/delete/       -> delete_note
/<int:id>/toggle-pin/   -> toggle_pin
/pinned/                -> pinned_notes
/deleted/               -> deleted_notes
```

The delete and pin forms use POST + `{% csrf_token %}`.

## Important

This frontend does not modify the model, views, migrations, or backend logic. Your backend branch should implement the model and URL/view names above. If the backend uses different URL names, only the `{% url ... %}` references in the templates need to be changed.
