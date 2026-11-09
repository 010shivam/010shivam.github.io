/* You never need to edit this file. Content lives in /content and /notes. */
(function () {
  const view = document.getElementById("view");
  const tabLinks = document.querySelectorAll("#tabs a");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fmt = iso => iso ? new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"}) : "";

  async function getText(path) {
    const r = await fetch(path, {cache: "no-cache"});
    if (!r.ok) throw new Error(path + " not found");
    return r.text();
  }

  /* "key: value" lines, then a line with ---, then the body */
  function parseDoc(text) {
    text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const i = text.search(/^---\s*$/m);
    let head = text, body = "";
    if (i !== -1) {
      head = text.slice(0, i);
      const nl = text.indexOf("\n", i);
      body = nl === -1 ? "" : text.slice(nl + 1);
    }
    const meta = {};
    head.split("\n").forEach(line => {
      if (line.trim().startsWith("#")) return;
      const m = line.match(/^\s*([A-Za-z_ ]+?)\s*:\s*(.*)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
    });
    return {meta, body};
  }

  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  function bodyToHtml(body) {
    return body.split(/\n\s*\n/).map(b => b.trim()).filter(b => b && !b.startsWith("#  ")).map(b => {
      if (b.startsWith("## ")) return "<h3>" + inline(b.slice(3)) + "</h3>";
      const lines = b.split("\n");
      if (lines.every(l => /^\s*-\s+/.test(l)))
        return "<ul>" + lines.map(l => "<li>" + inline(l.replace(/^\s*-\s+/, "")) + "</li>").join("") + "</ul>";
      return "<p>" + inline(lines.join(" ")) + "</p>";
    }).join("");
  }

  let homeCache = null, notesCache = null;
  async function getHome() {
    if (!homeCache) {
      const {meta, body} = parseDoc(await getText("content/home.txt"));
      const facts = body.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"))
        .map(l => { const k = l.indexOf(":"); return k > 0 ? [l.slice(0, k).trim(), l.slice(k + 1).trim()] : null; })
        .filter(Boolean);
      homeCache = {name: meta.name || "Your Name", tagline: meta.tagline || "", intro: meta.intro || "", photo: meta.photo || "", facts};
    }
    return homeCache;
  }
  async function getNotes() {
    if (notesCache) return notesCache;
    const files = JSON.parse(await getText("notes/index.json"));
    const list = await Promise.all(files.map(async f => {
      try {
        const {meta, body} = parseDoc(await getText("notes/" + f));
        return {id: f.replace(/\.[^.]+$/, ""), title: meta.title || f, date: meta.date || "", tag: meta.tag || "",
                summary: meta.summary || "", pdf: meta.pdf || "", body: bodyToHtml(body)};
      } catch (e) { return null; }
    }));
    notesCache = list.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    return notesCache;
  }

  async function home() {
    const H = await getHome();
    const photo = H.photo ? `<img src="${esc(H.photo)}" alt="Photo of ${esc(H.name)}">`
                          : `<span class="mono">[ Your photo ]<br>3:4 portrait</span>`;
    const rows = H.facts.map(f => `<tr><th>${esc(f[0])}</th><td>${esc(f[1])}</td></tr>`).join("");
    return `<section class="home">
      <div class="photo">${photo}</div>
      <div class="head"><h1>${esc(H.name)}</h1><p class="tagline">${esc(H.tagline)}</p></div>
      <p class="intro">${esc(H.intro)}</p>
      ${rows ? `<table class="facts"><tbody>${rows}</tbody></table>` : ""}
    </section>`;
  }

  function notesList(list) {
    const items = list.map(n => `<li>
      <span class="date">${fmt(n.date)}</span>
      <a class="t" href="#notes/${encodeURIComponent(n.id)}">${esc(n.title)}</a>
      <span class="tag">${esc(n.tag)}</span>
      <span class="s">${esc(n.summary)}</span></li>`).join("");
    return `<h2>Notes</h2><p class="mono" style="font-size:12px;color:var(--grey)">Selected thoughts and investigations.</p><hr><ul class="notes-list">${items}</ul>`;
  }

  function article(n) {
    const url = /^https?:/.test(n.pdf) ? n.pdf : "notes/pdfs/" + n.pdf;
    const pdf = n.pdf ? `<p><a class="pdf-link" href="${esc(url)}" target="_blank" rel="noopener">Read the full paper (PDF) &raquo;</a></p>` : "";
    return `<article class="article">
      <a class="back" href="#notes">&laquo; Back to notes</a>
      <h2>${esc(n.title)}</h2>
      <div class="meta"><span class="date">${fmt(n.date)}</span><span class="tag">${esc(n.tag)}</span></div>
      <hr><div class="body">${n.body}</div>
      ${pdf}
      <hr><a class="back" href="#notes">&laquo; Back to notes</a>
    </article>`;
  }

  async function contact() {
    const H = await getHome();
    let note = "";
    const rows = (await getText("content/contact.txt")).replace(/\r/g, "").split("\n").map(l => l.trim())
      .filter(l => l && !l.startsWith("#")).map(l => {
        if (/^note\s*:/i.test(l)) { note = l.replace(/^note\s*:\s*/i, ""); return ""; }
        const [label, text, url] = l.split("|").map(s => s.trim());
        const cell = url ? `<a href="${esc(url)}" ${url.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${esc(text)}</a>` : esc(text || "");
        return `<tr><th>${esc(label)}</th><td>${cell}</td></tr>`;
      }).join("");
    return `<section class="contact"><h2>Contact</h2>
      <table class="card"><caption>Contact card: ${esc(H.name)}</caption><tbody>${rows}</tbody></table>
      ${note ? `<p style="font-size:.9em">${esc(note)}</p>` : ""}</section>`;
  }

  let token = 0;
  async function route() {
    const my = ++token;
    const parts = (location.hash.replace("#", "") || "home").split("/");
    const tab = ["home", "notes", "contact"].includes(parts[0]) ? parts[0] : "home";
    let html = "", title = "";
    try {
      const H = await getHome();
      if (tab === "notes") {
        const list = await getNotes();
        const n = parts[1] && list.find(x => x.id === decodeURIComponent(parts[1]));
        html = n ? article(n) : notesList(list);
        title = n ? n.title + " - " : "";
      } else html = await (tab === "home" ? home() : contact());
      document.title = title + H.name + " - Finance Notes";
    } catch (e) {
      html = `<div class="notice"><h2>Could not load content</h2><p>${esc(e.message)}</p>
        <p>If you opened this file by double-clicking it, browsers block loading the content files. Upload the site to a host (GitHub Pages, Netlify) or run <span class="mono">python -m http.server</span> in this folder and visit <span class="mono">localhost:8000</span>.</p></div>`;
    }
    if (my !== token) return;
    view.innerHTML = html;
    view.className = tab === "notes" ? "scroll" : "";
    view.scrollTop = 0;
    tabLinks.forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
  }
  addEventListener("hashchange", route);
  route();
})();
