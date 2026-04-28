(function () {
  "use strict";

  var STORAGE_KEY = "su-qr-rows-v2";
  var DEFAULT_ROWS = [
    { id: "r1", label: "Strathmore Connect", url: "https://strathmoreconnect.org", generated: false },
    { id: "r2", label: "Nakuru Alumni Register", url: "https://bit.ly/SU-Alumni-Nakuru", generated: false },
    { id: "r3", label: "Alumni Email", url: "mailto:alumni@strathmore.edu", generated: false }
  ];
  var MAX_URL_LENGTH = 2048;
  var ALLOWED_SCHEMES = ["https:", "http:", "mailto:", "tel:", "sms:"];

  var state = {
    rows: [],
    modalRowId: null,
    saveTimer: null,
    badgeTimer: null,
    bannerTimer: null
  };

  var elements = {
    body: document.getElementById("qr-body"),
    rowCount: document.getElementById("row-count"),
    saveBadge: document.getElementById("save-badge"),
    banner: document.getElementById("message-banner"),
    addRowButton: document.getElementById("add-row-btn"),
    modal: document.getElementById("modal"),
    modalLabel: document.getElementById("modal-label"),
    modalUrl: document.getElementById("modal-url"),
    modalQrContainer: document.getElementById("modal-qr-container"),
    downloadButton: document.getElementById("download-btn"),
    closeModalButton: document.getElementById("close-modal-btn")
  };

  function cloneDefaultRows() {
    return DEFAULT_ROWS.map(function (row) {
      return {
        id: row.id,
        label: row.label,
        url: row.url,
        generated: Boolean(row.generated)
      };
    });
  }

  function normalizeSavedRows(rows) {
    if (!Array.isArray(rows)) {
      return cloneDefaultRows();
    }

    return rows
      .map(function (row, index) {
        if (!row || typeof row !== "object") {
          return null;
        }

        var id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : "r" + Date.now() + "-" + index;
        var label = typeof row.label === "string" ? row.label.slice(0, 120) : "";
        var url = typeof row.url === "string" ? row.url.slice(0, MAX_URL_LENGTH) : "";

        return {
          id: id,
          label: label,
          url: url,
          generated: Boolean(row.generated)
        };
      })
      .filter(Boolean);
  }

  function loadRows() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      state.rows = raw ? normalizeSavedRows(JSON.parse(raw)) : cloneDefaultRows();
    } catch (error) {
      state.rows = cloneDefaultRows();
      showBanner("Stored data could not be read, so the default links were restored.", "error");
    }

    if (!state.rows.length) {
      state.rows = cloneDefaultRows();
    }

    renderTable();
  }

  function persistRows() {
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(function () {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rows));
        showSavedBadge();
      } catch (error) {
        showBanner("This browser could not save your latest change to local storage.", "error");
      }
    }, 250);
  }

  function showSavedBadge() {
    elements.saveBadge.hidden = false;
    window.clearTimeout(state.badgeTimer);
    state.badgeTimer = window.setTimeout(function () {
      elements.saveBadge.hidden = true;
    }, 1800);
  }

  function showBanner(message, tone) {
    elements.banner.textContent = message;
    elements.banner.dataset.tone = tone;
    elements.banner.hidden = false;

    window.clearTimeout(state.bannerTimer);
    if (tone !== "error") {
      state.bannerTimer = window.setTimeout(function () {
        clearBanner();
      }, 2200);
    }
  }

  function clearBanner() {
    elements.banner.hidden = true;
    elements.banner.textContent = "";
    delete elements.banner.dataset.tone;
  }

  function getRow(id) {
    return state.rows.find(function (row) {
      return row.id === id;
    }) || null;
  }

  function createButton(text, className, type) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    if (type) {
      button.dataset.action = type;
    }
    return button;
  }

  function createInput(rowId, fieldName, value, placeholder) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "text-input";
    input.value = value;
    input.placeholder = placeholder;
    input.maxLength = fieldName === "label" ? 120 : MAX_URL_LENGTH;
    input.dataset.rowId = rowId;
    input.dataset.field = fieldName;
    input.autocomplete = "off";
    input.spellcheck = false;
    return input;
  }

  function createQrThumb(row) {
    var thumb = document.createElement("div");
    thumb.className = "qr-thumb";
    thumb.id = "thumb-" + row.id;
    thumb.appendChild(createEmptyQr("QR"));

    if (row.generated) {
      window.setTimeout(function () {
        generateQr(row.id, true);
      }, 0);
    }

    return thumb;
  }

  function createEmptyQr(label) {
    var empty = document.createElement("div");
    empty.className = "empty-qr";
    empty.textContent = label;
    return empty;
  }

  function renderTable() {
    elements.body.textContent = "";

    state.rows.forEach(function (row, index) {
      var tr = document.createElement("tr");

      var numCell = document.createElement("td");
      numCell.className = "col-num";
      numCell.textContent = String(index + 1);

      var labelCell = document.createElement("td");
      labelCell.className = "col-label";
      labelCell.appendChild(createInput(row.id, "label", row.label, "Label"));

      var urlCell = document.createElement("td");
      urlCell.className = "col-url";
      urlCell.appendChild(createInput(row.id, "url", row.url, "https://example.org"));

      var qrCell = document.createElement("td");
      qrCell.className = "col-qr";
      qrCell.appendChild(createQrThumb(row));

      var actionsCell = document.createElement("td");
      actionsCell.className = "col-actions";
      var actions = document.createElement("div");
      actions.className = "actions";

      var generateButton = createButton("Generate", "btn btn-primary", "generate");
      generateButton.dataset.rowId = row.id;

      var viewButton = createButton("View", "btn btn-secondary", "view");
      viewButton.dataset.rowId = row.id;
      viewButton.hidden = !row.generated;

      actions.appendChild(generateButton);
      actions.appendChild(viewButton);
      actionsCell.appendChild(actions);

      var deleteCell = document.createElement("td");
      deleteCell.className = "col-delete";
      var deleteButton = createButton("×", "icon-btn", "delete");
      deleteButton.dataset.rowId = row.id;
      deleteButton.setAttribute("aria-label", "Delete this row");
      deleteCell.appendChild(deleteButton);

      tr.appendChild(numCell);
      tr.appendChild(labelCell);
      tr.appendChild(urlCell);
      tr.appendChild(qrCell);
      tr.appendChild(actionsCell);
      tr.appendChild(deleteCell);
      elements.body.appendChild(tr);
    });

    elements.rowCount.textContent = state.rows.length + (state.rows.length === 1 ? " link" : " links");
  }

  function addRow() {
    var id = "r" + Date.now();
    state.rows.push({
      id: id,
      label: "",
      url: "",
      generated: false
    });
    persistRows();
    clearBanner();
    renderTable();

    var newUrlInput = document.querySelector('input[data-row-id="' + id + '"][data-field="url"]');
    if (newUrlInput) {
      newUrlInput.focus();
    }
  }

  function deleteRow(id) {
    var row = getRow(id);
    if (!row) {
      return;
    }

    var confirmed = window.confirm("Remove this link and its saved preview?");
    if (!confirmed) {
      return;
    }

    state.rows = state.rows.filter(function (item) {
      return item.id !== id;
    });
    persistRows();
    clearBanner();
    renderTable();
  }

  function updateField(id, field, value) {
    var row = getRow(id);
    if (!row) {
      return;
    }

    row[field] = field === "label" ? value.slice(0, 120) : value.slice(0, MAX_URL_LENGTH);
    if (field === "url") {
      row.generated = false;
      resetThumb(id);
    }
    persistRows();
  }

  function resetThumb(id) {
    var row = getRow(id);
    var thumb = document.getElementById("thumb-" + id);
    if (thumb) {
      thumb.textContent = "";
      thumb.appendChild(createEmptyQr("QR"));
    }
    if (row) {
      row.generated = false;
    }
    var viewButton = document.querySelector('button[data-action="view"][data-row-id="' + id + '"]');
    if (viewButton) {
      viewButton.hidden = true;
    }
  }

  function looksLikeDomain(value) {
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(value);
  }

  function sanitizeUrl(value) {
    var trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed) {
      return { ok: false, message: "Enter a destination before generating a QR code." };
    }

    if (trimmed.length > MAX_URL_LENGTH) {
      return { ok: false, message: "That destination is too long to save safely." };
    }

    var normalized = trimmed;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized) && looksLikeDomain(normalized)) {
      normalized = "https://" + normalized;
    }

    try {
      var url = new URL(normalized);
      if (ALLOWED_SCHEMES.indexOf(url.protocol) === -1) {
        return {
          ok: false,
          message: "Only http, https, mailto, tel, and sms destinations are allowed."
        };
      }

      if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname) {
        return { ok: false, message: "That web link is missing a hostname." };
      }

      return { ok: true, value: url.href };
    } catch (error) {
      return { ok: false, message: "That destination could not be parsed. Check the format and try again." };
    }
  }

  function getQrLibrary() {
    if (typeof window.QRCode !== "function") {
      showBanner("The QR library did not load. Check your connection and refresh the page.", "error");
      return null;
    }

    return window.QRCode;
  }

  function generateQr(id, silent) {
    var row = getRow(id);
    if (!row) {
      return false;
    }

    var validation = sanitizeUrl(row.url);
    if (!validation.ok) {
      resetThumb(id);
      if (!silent) {
        showBanner(validation.message, "error");
      }
      return false;
    }

    var QRCode = getQrLibrary();
    if (!QRCode) {
      return false;
    }

    row.url = validation.value;
    var thumb = document.getElementById("thumb-" + id);
    if (!thumb) {
      return false;
    }

    thumb.textContent = "";
    var holder = document.createElement("div");
    holder.className = "qr-thumb-inner";
    thumb.appendChild(holder);

    try {
      new QRCode(holder, {
        text: row.url,
        width: 56,
        height: 56,
        correctLevel: QRCode.CorrectLevel.M
      });
      row.generated = true;
      persistRows();

      var viewButton = document.querySelector('button[data-action="view"][data-row-id="' + id + '"]');
      if (viewButton) {
        viewButton.hidden = false;
      }

      if (!silent) {
        showBanner("QR code generated successfully.", "success");
      }

      renderValueBackIntoInput(id, "url", row.url);
      return true;
    } catch (error) {
      resetThumb(id);
      if (!silent) {
        showBanner("The QR code could not be generated for that destination.", "error");
      }
      return false;
    }
  }

  function renderValueBackIntoInput(rowId, field, value) {
    var input = document.querySelector('input[data-row-id="' + rowId + '"][data-field="' + field + '"]');
    if (input) {
      input.value = value;
    }
  }

  function safeFileName(input) {
    var label = input.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "").replace(/\s+/g, "_");
    return label || "qr_code";
  }

  function openModal(id) {
    var row = getRow(id);
    if (!row) {
      return;
    }

    var validation = sanitizeUrl(row.url);
    if (!validation.ok) {
      showBanner(validation.message, "error");
      return;
    }

    if (!row.generated) {
      var generated = generateQr(id, true);
      if (!generated) {
        return;
      }
    }

    var QRCode = getQrLibrary();
    if (!QRCode) {
      return;
    }

    state.modalRowId = id;
    elements.modalLabel.textContent = row.label.trim() || "QR Code";
    elements.modalUrl.textContent = validation.value;
    elements.modalQrContainer.textContent = "";

    var holder = document.createElement("div");
    holder.className = "modal-qr-inner";
    elements.modalQrContainer.appendChild(holder);

    new QRCode(holder, {
      text: validation.value,
      width: 220,
      height: 220,
      correctLevel: QRCode.CorrectLevel.H
    });

    elements.modal.hidden = false;
    elements.closeModalButton.focus();
  }

  function closeModal() {
    elements.modal.hidden = true;
    elements.modalQrContainer.textContent = "";
    state.modalRowId = null;
  }

  function downloadModal() {
    var container = elements.modalQrContainer;
    var row = state.modalRowId ? getRow(state.modalRowId) : null;
    if (!row) {
      return;
    }

    var canvas = container.querySelector("canvas");
    var image = container.querySelector("img");
    var link = document.createElement("a");
    link.download = safeFileName(row.label || "qr_code") + ".png";

    if (canvas) {
      link.href = canvas.toDataURL("image/png");
    } else if (image) {
      link.href = image.src;
    } else {
      showBanner("There is no QR code ready to download yet.", "error");
      return;
    }

    link.click();
  }

  function handleBodyInput(event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    var rowId = target.dataset.rowId;
    var field = target.dataset.field;
    if (!rowId || !field) {
      return;
    }

    updateField(rowId, field, target.value);
  }

  function handleBodyClick(event) {
    var target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    var actionButton = target.closest("button[data-action]");
    if (!actionButton) {
      return;
    }

    var action = actionButton.dataset.action;
    var rowId = actionButton.dataset.rowId;
    if (!rowId) {
      return;
    }

    if (action === "generate") {
      generateQr(rowId, false);
      return;
    }

    if (action === "view") {
      openModal(rowId);
      return;
    }

    if (action === "delete") {
      deleteRow(rowId);
    }
  }

  function handleBodyKeydown(event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (event.key === "Enter") {
      var rowId = target.dataset.rowId;
      if (rowId) {
        generateQr(rowId, false);
      }
    }
  }

  function handleWindowKeydown(event) {
    if (event.key === "Escape" && !elements.modal.hidden) {
      closeModal();
    }
  }

  function handleModalBackdropClick(event) {
    if (event.target === elements.modal) {
      closeModal();
    }
  }

  function bindEvents() {
    elements.addRowButton.addEventListener("click", addRow);
    elements.body.addEventListener("input", handleBodyInput);
    elements.body.addEventListener("click", handleBodyClick);
    elements.body.addEventListener("keydown", handleBodyKeydown);
    elements.modal.addEventListener("click", handleModalBackdropClick);
    elements.closeModalButton.addEventListener("click", closeModal);
    elements.downloadButton.addEventListener("click", downloadModal);
    window.addEventListener("keydown", handleWindowKeydown);
  }

  bindEvents();
  loadRows();
})();
