const API_URL = "/api/notes/";
let notes = [];
let currentFilter = "all";
let currentDetailId = null;

const $ = (selector) => document.querySelector(selector);

function csrfToken() {
    const cookie = document.cookie.split("; ").find(row => row.startsWith("csrftoken="));
    if (cookie) return decodeURIComponent(cookie.split("=").slice(1).join("="));
    const input = document.querySelector("[name=csrfmiddlewaretoken]");
    return input ? input.value : "";
}

async function apiRequest(url, options = {}) {
    const config = { ...options, headers: { ...(options.headers || {}) } };
    if (options.body) config.headers["Content-Type"] = "application/json";
    if (["POST", "PUT", "PATCH", "DELETE"].includes(options.method)) {
        config.headers["X-CSRFToken"] = csrfToken();
    }
    const response = await fetch(url, config);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
        const message = data?.detail || data?.message || data?.error || (typeof data === "string" ? data : "Request failed");
        throw new Error(message);
    }
    return data;
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).toUpperCase();
}

function updateClock() {
    const now = new Date();
    $("#todayLabel").textContent = now.toLocaleDateString([], { weekday: "long" });
    $("#clockLabel").textContent = now.toLocaleString([], { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).toUpperCase();
    $("#editorDate").textContent = $("#clockLabel").textContent;
}

function showStatus(message, type = "ok") {
    const el = $("#status");
    el.textContent = message;
    el.className = `status ${type}`;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => { el.textContent = ""; el.className = "status"; }, 2600);
}

function visibleNotes() {
    const query = $("#searchInput").value.trim().toLowerCase();
    let result = notes.filter(note => currentFilter === "pinned" ? Boolean(note.pinned) : true);
    if (query) result = result.filter(note => `${note.title} ${note.content}`.toLowerCase().includes(query));
    const sort = $("#sortSelect").value;
    if (sort === "title") result.sort((a,b) => a.title.localeCompare(b.title));
    if (sort === "oldest") result.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    if (sort === "newest") result.sort((a,b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    return result;
}

function noteMarkup(note) {
    const content = escapeHtml(note.content || "");
    const short = content.length > 850 ? `${content.slice(0, 850)}…` : content;
    return `
        <article class="note-sheet" data-id="${note.id}">
            <div class="paper-holes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="red-margin" aria-hidden="true"></div>
            <div class="note-inner">
                <div class="note-head">
                    <span class="note-day">${note.pinned ? "PINNED" : "NOTE"}</span>
                    <span class="note-date">${formatDate(note.updated_at || note.created_at)}</span>
                </div>
                <button class="note-pin ${note.pinned ? "pinned" : ""}" data-action="pin" title="${note.pinned ? "Remove from favourites" : "Add to favourites"}">📌</button>
                <h2 class="note-title">${escapeHtml(note.title)}</h2>
                <p class="note-content">${short}</p>
                <div class="note-bottom">
                    <button class="note-action" data-action="view" title="View note">⌕</button>
                    <button class="note-action" data-action="edit" title="Edit note">✎</button>
                    <button class="note-action delete" data-action="delete" title="Delete note">⌫</button>
                    <span class="note-label">NOTE</span>
                </div>
            </div>
        </article>`;
}

function renderNotes() {
    $("#allCount").textContent = notes.length;
    $("#pinnedCount").textContent = notes.filter(n => n.pinned).length;
    const result = visibleNotes();
    const list = $("#notesList");
    if (!result.length) {
        list.innerHTML = `<div class="note-sheet empty-note"><div class="big">📝</div><h2>No notes yet</h2><p>Create your first handwritten-style note.</p><button class="header-btn" id="emptyNewNote" type="button">+ New Note</button></div>`;
        $("#emptyNewNote").onclick = () => openEditor();
        return;
    }
    list.innerHTML = result.map(noteMarkup).join("");
}

function autoGrowNoteContent() {
    const textarea = $("#noteContent");
    if (!textarea) return;

    // No internal scrollbar: let the textarea grow to exactly fit its content.
    textarea.style.height = "42px";
    textarea.style.height = `${Math.max(42, textarea.scrollHeight)}px`;
}

function openEditor(note = null) {
    $("#noteId").value = note?.id || "";
    $("#noteTitle").value = note?.title || "";
    $("#noteContent").value = note?.content || "";
    $("#notePinned").checked = Boolean(note?.pinned);
    $("#editorLabel").textContent = note ? "EDIT NOTE" : "NEW NOTE";
    $("#editorTitle").textContent = note ? "Edit your note" : "Write a note";
    $("#saveNoteBtn").textContent = note ? "Update Note" : "Save Note";
    updateClock();
    $("#editorOverlay").hidden = false;
    // Calculate the initial height after the editor becomes visible.
    requestAnimationFrame(autoGrowNoteContent);
    setTimeout(() => $("#noteTitle").focus(), 0);
}
function closeEditor() { $("#editorOverlay").hidden = true; }

function openDetail(note) {
    currentDetailId = Number(note.id);
    $("#detailLabel").textContent = note.pinned ? "PINNED" : "NOTE";
    $("#detailDate").textContent = formatDate(note.updated_at || note.created_at);
    $("#detailTitle").textContent = note.title;
    $("#detailContent").textContent = note.content;
    $("#detailPin").textContent = note.pinned ? "📌 Unpin" : "📌 Favourite";
    $("#detailOverlay").hidden = false;
}
function closeDetail() { $("#detailOverlay").hidden = true; currentDetailId = null; }

async function loadNotes() {
    try {
        const data = await apiRequest(API_URL);
        notes = Array.isArray(data) ? data : (data.results || []);
        renderNotes();
    } catch (error) {
        $("#notesList").innerHTML = `<div class="note-sheet empty-note"><div class="big">⚠</div><h2>Could not load notes</h2><p>${escapeHtml(error.message)}</p><p>Make sure Django and the REST API are running.</p></div>`;
    }
}

async function saveNote(event) {
    event.preventDefault();
    const id = $("#noteId").value;
    const payload = {
        title: $("#noteTitle").value.trim(),
        content: $("#noteContent").value.trim(),
        pinned: $("#notePinned").checked
    };
    if (!payload.title || !payload.content) return showStatus("Title and content are required.", "error");
    try {
        const saved = await apiRequest(id ? `${API_URL}${id}/` : API_URL, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
        if (id) notes = notes.map(note => Number(note.id) === Number(id) ? saved : note);
        else notes.unshift(saved);
        closeEditor();
        renderNotes();
        showStatus(id ? "Note updated." : "Note created.");
    } catch (error) { showStatus(error.message, "error"); }
}

async function togglePin(id) {
    const note = notes.find(n => Number(n.id) === Number(id));
    if (!note) return;
    try {
        const updated = await apiRequest(`${API_URL}${id}/`, { method: "PUT", body: JSON.stringify({ title: note.title, content: note.content, pinned: !note.pinned }) });
        notes = notes.map(n => Number(n.id) === Number(id) ? updated : n);
        renderNotes();
        if (currentDetailId === Number(id)) openDetail(updated);
        showStatus(updated.pinned ? "Added to favourites." : "Removed from favourites.");
    } catch (error) { showStatus(error.message, "error"); }
}

async function deleteNote(id) {
    const note = notes.find(n => Number(n.id) === Number(id));
    if (!note || !confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    try {
        await apiRequest(`${API_URL}${id}/`, { method: "DELETE" });
        notes = notes.filter(n => Number(n.id) !== Number(id));
        if (currentDetailId === Number(id)) closeDetail();
        renderNotes();
        showStatus("Note deleted.");
    } catch (error) { showStatus(error.message, "error"); }
}

document.addEventListener("DOMContentLoaded", () => {
    updateClock();
    setInterval(updateClock, 30000);
    $("#newNoteBtn").onclick = () => openEditor();
    $("#closeEditor").onclick = closeEditor;
    $("#cancelEditor").onclick = closeEditor;
    $("#noteForm").onsubmit = saveNote;
    $("#noteContent").addEventListener("input", autoGrowNoteContent);
    $("#closeDetail").onclick = closeDetail;
    $("#searchInput").oninput = renderNotes;
    $("#sortSelect").onchange = renderNotes;

    document.querySelectorAll(".filter-btn").forEach(button => {
        button.onclick = () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            currentFilter = button.dataset.filter;
            renderNotes();
        };
    });

    $("#notesList").addEventListener("click", event => {
        const action = event.target.closest("[data-action]");
        if (!action) return;
        const id = Number(action.closest("[data-id]").dataset.id);
        const note = notes.find(n => Number(n.id) === id);
        if (!note) return;
        if (action.dataset.action === "pin") togglePin(id);
        if (action.dataset.action === "view") openDetail(note);
        if (action.dataset.action === "edit") openEditor(note);
        if (action.dataset.action === "delete") deleteNote(id);
    });

    $("#detailEdit").onclick = () => {
        const note = notes.find(n => Number(n.id) === currentDetailId);
        closeDetail();
        if (note) openEditor(note);
    };
    $("#detailDelete").onclick = () => { if (currentDetailId) deleteNote(currentDetailId); };
    $("#detailPin").onclick = () => { if (currentDetailId) togglePin(currentDetailId); };

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") { closeEditor(); closeDetail(); }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault(); $("#searchInput").focus();
        }
    });

    loadNotes();
});
